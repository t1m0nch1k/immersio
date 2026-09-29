import { UserState } from '../types';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * What actually travels to the server.
 *
 * Two things are deliberately left behind:
 *
 * - `avatar`. A photo is stored inline as a base64 data URL and is capped at
 *   ~60 KB. Sending it on every push would dominate the payload for something
 *   that describes the device, not the person: signing in on a new phone
 *   restoring your streak but showing a default fox is the correct behaviour.
 * - `account.isAuth`. It is derived from the live session, and storing a stale
 *   copy would let a signed-out device look signed in after a pull.
 */
export interface SyncedAccount {
  email: string;
  name: string;
  userId?: string;
  tier: UserState['account']['tier'];
  subscribedDate?: string;
  subscriptionPlan?: 'monthly' | 'yearly' | 'lifetime';
}

export type SyncedState = Omit<UserState, 'avatar' | 'account'> & { account: SyncedAccount };

const TABLE = 'profiles';

export const projectForSync = (state: UserState): SyncedState => {
  const { avatar: _avatar, account, ...rest } = state;
  const { isAuth: _isAuth, ...syncedAccount } = account;
  return { ...rest, account: syncedAccount } as SyncedState;
};

/**
 * Rebuilds a full `UserState` from a server row.
 *
 * The avatar is the local one because it was never sent. `load()` is
 * deliberately not involved: the caller already holds a sanitised state and only
 * the progress half is being replaced, so re-running the whole loader would
 * throw away unsaved local settings for no reason.
 */
export const applyFromSync = (synced: unknown, local: UserState): UserState | null => {
  if (!synced || typeof synced !== 'object' || Array.isArray(synced)) return null;
  const record = synced as Record<string, unknown>;
  if (!record.languages || typeof record.languages !== 'object') return null;

  return {
    ...local,
    ...(record as unknown as Omit<UserState, 'avatar' | 'account'>),
    avatar: local.avatar,
    account: {
      ...local.account,
      ...((record.account as object | undefined) ?? {}),
      isAuth: true,
    },
  } as UserState;
};

export interface RemoteSnapshot {
  state: Record<string, unknown>;
  updatedAt: string;
}

/**
 * The server calls the service makes, behind an interface.
 *
 * The real implementation is two PostgREST requests. Tests pass a fake, so the
 * conflict logic — the part that can silently lose somebody's streak — is
 * testable without a network or a Supabase account.
 */
export interface SyncBackend {
  pull(userId: string): Promise<RemoteSnapshot | null>;
  push(userId: string, state: Record<string, unknown>): Promise<RemoteSnapshot>;
}

export const createSupabaseBackend = (client: SupabaseClient): SyncBackend => ({
  async pull(userId) {
    const { data, error } = await client
      .from(TABLE)
      .select('state, updated_at')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return {
      state: (data.state ?? {}) as Record<string, unknown>,
      updatedAt: String(data.updated_at),
    };
  },

  async push(userId, state) {
    // `updated_at` is set by a database trigger, so the value that comes back
    // is the server's clock rather than whatever the client claimed. Storing
    // the client's own timestamp instead would let a device with a wrong clock
    // win every conflict from now on.
    const { data, error } = await client
      .from(TABLE)
      .upsert({ id: userId, state, schema_version: 1 }, { onConflict: 'id' })
      .select('state, updated_at')
      .single();
    if (error) throw new Error(error.message);
    return {
      state: (data.state ?? {}) as Record<string, unknown>,
      updatedAt: String(data.updated_at),
    };
  },
});

/** Device-scoped sync bookkeeping. Separate from `UserState` on purpose. */
export type SyncMarker = {
  /** The `updated_at` this device last reconciled with, verbatim. */
  lastSyncedAt: string | null;
  /** Local changes made since that reconciliation. */
  dirty: boolean;
};

/**
 * What to do when a session is established and the server has been read.
 *
 * Split out as a pure function because this is the one piece of the engine that
 * can quietly destroy somebody's work. It has four cases and no I/O, so every
 * one of them is directly testable:
 *
 * - `none`    — nothing on either side has moved. Do nothing.
 * - `pull`    — the server moved, this device has nothing unsent. Adopt it.
 * - `push`    — this device has unsent changes and the server has not moved
 *               since the last look. Send them.
 * - `conflict` — both moved. One side is about to lose work, so the person
 *               decides. There is no safe automatic answer: merging SRS
 *               schedules field by field would invent a history nobody lived.
 */
export type ReconcileDecision = 'none' | 'pull' | 'push' | 'conflict';

export const decideReconcile = (marker: SyncMarker, remote: RemoteSnapshot | null): ReconcileDecision => {
  // A first link: the server knows nothing about this person yet, so there is
  // nothing to disagree with.
  if (remote === null) return 'push';
  const serverMoved = remote.updatedAt !== marker.lastSyncedAt;
  if (!marker.dirty) return serverMoved ? 'pull' : 'none';
  return serverMoved ? 'conflict' : 'push';
};

export type SyncStatus =
  | 'unconfigured'
  | 'guest'
  | 'idle'
  | 'pending'
  | 'syncing'
  | 'offline'
  | 'conflict'
  | 'error';

export interface SyncStateView {
  status: SyncStatus;
  /** `YYYY-MM-DD HH:MM` of the last successful reconciliation, or ''. */
  lastSyncedLabel: string;
  message: string;
  /** True while the user has to choose between two versions. */
  awaitingChoice: boolean;
}
