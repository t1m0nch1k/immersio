import { UserState } from '../types';
import {
  applyFromSync,
  createSupabaseBackend,
  decideReconcile,
  projectForSync,
  SyncBackend,
  SyncMarker,
  SyncStateView,
  SyncStatus,
} from './syncTypes';
import { getSupabase, isSyncConfigured } from './supabase';

/**
 * The sync engine.
 *
 * localStorage is the source of truth. Nothing the user does waits for a
 * network round trip, and nothing the network says can interrupt them mid-lesson.
 * This service mirrors that state to Supabase so it can follow the person to
 * another device, and resolves the one genuinely dangerous case: both sides
 * changed while the other was not looking.
 *
 * The debounce lives here, not in React. Twenty-four of the twenty-nine
 * `StorageService.save` call sites mutate the state in place and then hand on a
 * shallow copy purely to force a re-render, and two services save without
 * telling React at all. A `useEffect` keyed on the state would therefore miss
 * writes and look like it worked while quietly dropping progress.
 */

const MARKER_KEY = 'pogruzhenie_sync_v1';

/** Quiet period after the last local write before anything is sent. */
const TRAILING_DEBOUNCE_MS = 3_000;

/**
 * Longest a change may sit unsent while the user keeps working. Without this a
 * learner working steadily would reset the timer on every tap and sync nothing
 * until they stopped, which is exactly when the app is most likely to be closed.
 */
const MAX_WAIT_MS = 60_000;

const EMPTY_VIEW: SyncStateView = {
  status: 'guest',
  lastSyncedLabel: '',
  message: '',
  awaitingChoice: false,
};

const readMarker = (): SyncMarker => {
  try {
    const raw = localStorage.getItem(MARKER_KEY);
    if (!raw) return { lastSyncedAt: null, dirty: false };
    const parsed = JSON.parse(raw) as Partial<SyncMarker>;
    return {
      lastSyncedAt: typeof parsed.lastSyncedAt === 'string' ? parsed.lastSyncedAt : null,
      dirty: parsed.dirty === true,
    };
  } catch {
    return { lastSyncedAt: null, dirty: false };
  }
};

const writeMarker = (marker: SyncMarker): void => {
  try {
    localStorage.setItem(MARKER_KEY, JSON.stringify(marker));
  } catch (e) {
    console.warn('Failed to record the sync marker', e);
  }
};

const formatStamp = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

type Listener = (view: SyncStateView) => void;

class SyncService {
  private backend: SyncBackend | null = null;
  private listeners = new Set<Listener>();
  private view: SyncStateView = { ...EMPTY_VIEW };
  private userId: string | null = null;
  private local: UserState | null = null;

  private pendingState: UserState | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  /** When the earliest unsent change was queued, for the 60s ceiling. */
  private firstQueuedAt = 0;
  private inFlight: Promise<void> | null = null;
  /** Set while the user is deciding between two versions. */
  private conflict: { remote: Record<string, unknown>; local: UserState; updatedAt: string } | null = null;

  constructor() {
    if (isSyncConfigured()) this.backend = createSupabaseBackend(getSupabase()!);
    this.view = { ...EMPTY_VIEW, status: isSyncConfigured() ? 'guest' : 'unconfigured' };
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    listener(this.view);
    return () => this.listeners.delete(listener);
  };

  getView = (): SyncStateView => this.view;

  private emit(patch: Partial<SyncStateView>): void {
    this.view = { ...this.view, ...patch };
    this.listeners.forEach((listener) => listener(this.view));
  }

  private describe(status: SyncStatus, message = ''): string {
    switch (status) {
      case 'unconfigured':
        return 'Облачной синхронизации нет: приложение работает на этом устройстве.';
      case 'guest':
        return 'Прогресс хранится только на этом устройстве.';
      case 'idle':
        return this.view.lastSyncedLabel
          ? `Синхронизировано: ${this.view.lastSyncedLabel}`
          : 'Синхронизировано.';
      case 'pending':
        return 'Есть неотправленные изменения.';
      case 'syncing':
        return 'Синхронизация…';
      case 'offline':
        return 'Нет связи. Прогресс сохранится и уйдёт при подключении.';
      case 'conflict':
        return 'Прогресс менялся на двух устройствах. Выбери, что оставить.';
      case 'error':
        return message || 'Не удалось синхронизировать. Попробуй позже.';
      default:
        return '';
    }
  }

  private setStatus(status: SyncStatus, message = ''): void {
    this.emit({ status, message: this.describe(status, message), awaitingChoice: status === 'conflict' });
  }

  /**
   * Binds the engine to a session.
   *
   * Called on start-up and after every sign-in or sign-out. Reconciliation only
   * runs on a *change* of user, so a re-render or a hot reload cannot start a
   * pull that overwrites unsaved work.
   */
  attach = async (state: UserState, userId: string | null): Promise<void> => {
    this.local = state;
    const changed = userId !== this.userId;
    this.userId = userId;
    if (!this.backend) {
      this.setStatus('unconfigured');
      return;
    }
    if (!userId) {
      this.clearTimers();
      this.pendingState = null;
      this.conflict = null;
      this.setStatus('guest');
      return;
    }
    this.setStatus(readMarker().dirty ? 'pending' : 'idle');
    if (changed) await this.reconcile();
  };

  /**
   * Queues a push. Called from `StorageService.save`.
   *
   * Returns immediately. A failure leaves the change marked dirty, which is the
   * whole point: the local write already succeeded, and the next attempt picks
   * up from there.
   */
  schedulePush = (state: UserState): void => {
    this.local = state;
    if (!this.userId || !this.backend) return;
    // A queued conflict means the user has not chosen yet. Silently pushing
    // would resolve it the wrong way without asking.
    if (this.conflict) return;

    this.pendingState = state;
    if (this.firstQueuedAt === 0) this.firstQueuedAt = Date.now();
    writeMarker({ lastSyncedAt: readMarker().lastSyncedAt, dirty: true });
    this.setStatus('pending');
    this.armTimer();
  };

  private armTimer(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    const waited = Date.now() - this.firstQueuedAt;
    const delay = Math.max(0, Math.min(TRAILING_DEBOUNCE_MS, MAX_WAIT_MS - waited));
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      void this.flush();
    }, delay);
  }

  private clearTimers(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = null;
    this.firstQueuedAt = 0;
  }

  /** Sends now, ignoring the debounce. Used on sign-out and by the UI. */
  flush = async (): Promise<void> => {
    this.clearTimers();
    if (this.inFlight) {
      // A push is already running. Chain onto it and re-run: the state captured
      // before it started is stale by definition.
      await this.inFlight;
      if (this.pendingState) return this.flush();
      return;
    }
    if (!this.backend || !this.userId || !this.pendingState) return;

    const state = this.pendingState;
    this.pendingState = null;
    this.setStatus('syncing');

    this.inFlight = (async () => {
      try {
        const result = await this.backend!.push(this.userId!, projectForSync(state) as unknown as Record<string, unknown>);
        writeMarker({ lastSyncedAt: result.updatedAt, dirty: this.pendingState !== null });
        this.emit({ lastSyncedLabel: formatStamp(result.updatedAt) });
        this.setStatus(this.pendingState ? 'pending' : 'idle');
        if (this.pendingState) this.armTimer();
      } catch (e) {
        // Put the state back so the change is not lost, and leave the marker
        // dirty so the next attempt retries.
        this.pendingState = state;
        const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
        this.setStatus(offline ? 'offline' : 'error', e instanceof Error ? e.message : String(e));
        this.armTimer();
      } finally {
        this.inFlight = null;
      }
    })();

    await this.inFlight;
  };

  /**
   * Decides what to do when a session is (re)established.
   *
   * All four outcomes are enumerated by `decideReconcile`, which is where the
   * conflict rule is tested. This only carries it out.
   */
  reconcile = async (): Promise<void> => {
    if (!this.backend || !this.userId || !this.local) return;
    const marker = readMarker();
    this.setStatus('syncing');
    try {
      const remote = await this.backend.pull(this.userId);
      const decision = decideReconcile(marker, remote);

      switch (decision) {
        case 'none':
          this.setStatus('idle');
          return;
        case 'pull':
          this.acceptRemote(remote!.state, remote!.updatedAt);
          return;
        case 'conflict':
          this.conflict = { remote: remote!.state, local: this.local, updatedAt: remote!.updatedAt };
          this.setStatus('conflict');
          return;
        case 'push':
          this.pendingState = this.local;
          await this.flush();
          return;
      }
    } catch (e) {
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
      this.setStatus(offline ? 'offline' : 'error', e instanceof Error ? e.message : String(e));
    }
  };

  private acceptRemote(remote: Record<string, unknown>, updatedAt: string): void {
    if (!this.local) return;
    const merged = applyFromSync(remote, this.local);
    if (!merged) {
      // A row this app cannot read is better left alone than allowed to empty
      // the screen: local progress is real, and the user can still push.
      this.setStatus('error', 'Сервер вернул данные, которые приложение не понимает.');
      return;
    }
    this.local = merged;
    this.pendingState = null;
    writeMarker({ lastSyncedAt: updatedAt, dirty: false });
    this.emit({ lastSyncedLabel: formatStamp(updatedAt) });
    this.setStatus('idle');
    this.onRemoteState?.(merged);
  }

  /**
   * Called with the state produced by a pull, so the owner can persist it and
   * re-render. Set by `App`, which is the only place that owns `UserState`.
   */
  onRemoteState: ((state: UserState) => void) | null = null;

  /** The user kept this device's version. */
  keepLocal = async (): Promise<void> => {
    if (!this.conflict || !this.local) return;
    this.conflict = null;
    this.pendingState = this.local;
    await this.flush();
  };

  /** The user kept the other device's version. */
  keepRemote = async (): Promise<void> => {
    const conflict = this.conflict;
    if (!conflict || !this.local) return;
    this.conflict = null;

    const merged = applyFromSync(conflict.remote, this.local);
    if (merged) {
      this.local = merged;
      // Not marked dirty: adopting the server's version is a reconciliation, not
      // a local change, and marking it dirty would make the next reconcile see a
      // phantom conflict.
      writeMarker({ lastSyncedAt: conflict.updatedAt, dirty: false });
      this.emit({ lastSyncedLabel: formatStamp(conflict.updatedAt) });
      this.onRemoteState?.(merged);
    }
    this.setStatus('idle');
  };

  /** Called on sign-out. Keeps the device's progress; stops mirroring it. */
  detach = async (): Promise<void> => {
    this.clearTimers();
    await this.flush().catch(() => undefined);
    this.pendingState = null;
    this.conflict = null;
    this.userId = null;
    this.local = null;
    writeMarker({ lastSyncedAt: null, dirty: false });
    this.emit({ lastSyncedLabel: '' });
    this.setStatus('guest');
  };

  /** Test seam. */
  reset = (): void => {
    this.clearTimers();
    this.pendingState = null;
    this.conflict = null;
    this.userId = null;
    this.local = null;
    this.backend = null;
  };

  setBackend = (backend: SyncBackend | null): void => {
    this.backend = backend;
  };
}

export const syncService = new SyncService();
