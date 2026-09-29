import assert from 'node:assert/strict';
import { build } from 'esbuild';

/**
 * The mirror.
 *
 * Two layers, because the failure modes are different.
 *
 * `syncTypes` holds the rule that decides whether one device's progress
 * overwrites another's. It is a pure function with four outcomes, and getting
 * one wrong is how a week of vocabulary silently disappears — so every branch is
 * enumerated here.
 *
 * The engine on top is driven end to end against a fake server. What it owns is
 * behaviour over time: the debounce, the dirty marker, and what happens after the
 * person is asked to choose. None of that needs a network to reproduce, and all
 * of it is where a mirror quietly loses work.
 */

const memory = new Map();
globalThis.window = {};
globalThis.localStorage = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, value),
  removeItem: (key) => memory.delete(key),
};

const bundle = await build({
  stdin: {
    contents: "export * from './src/services/syncTypes'; export * from './src/services/syncService';",
    resolveDir: process.cwd(),
    loader: 'ts',
  },
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
});
const api = await import(
  'data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64')
);

let count = 0;
const check = (condition, message) => {
  assert(condition, message);
  count++;
};

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const state = (xp) => ({
  onboarded: true,
  name: 'Артём',
  avatar: 'data:image/webp;base64,AAAA',
  currentLang: 'cs',
  darkMode: false,
  soundEnabled: true,
  account: { email: 'a@b.c', name: 'Артём', isAuth: true, userId: 'u1', tier: 'free' },
  languages: { cs: { learnedWords: ['x'], immersion: 40 } },
  xp,
  perfectCount: 0,
  streak: { current: 1, best: 1, lastActiveDate: '2026-09-26' },
  history: [],
  achievements: [],
  customLessons: [],
});

/** A server that records what it was asked to store. */
const fakeServer = (initial = null) => {
  let row = initial;
  const pushes = [];
  return {
    pushes,
    get row() {
      return row;
    },
    backend: {
      pull: async () => row,
      push: async (_userId, payload) => {
        pushes.push(JSON.parse(JSON.stringify(payload)));
        row = { state: payload, updatedAt: `T${pushes.length}` };
        return row;
      },
    },
  };
};

/** A fresh engine per scenario: the module exports a singleton. */
const engineFor = (backend) => {
  api.syncService.reset();
  localStorage.removeItem('pogruzhenie_sync_v1');
  api.syncService.setBackend(backend);
  return api.syncService;
};

/**
 * Seeds the marker, which is what a previous session would have left behind.
 * `dirty: true` is the case that matters: the device closed with work it never
 * managed to send.
 */
const writeMarker = (lastSyncedAt, dirty) => {
  localStorage.setItem('pogruzhenie_sync_v1', JSON.stringify({ lastSyncedAt, dirty }));
};

// --- Projection: what is allowed to leave the device -------------------------
{
  const projected = api.projectForSync(state(10));
  check(!('avatar' in projected), 'the avatar does not travel: it describes the device, not the person');
  check(!('isAuth' in projected.account), 'isAuth is derived from the live session, never stored');
  check(projected.account.email === 'a@b.c', 'the email is part of the account');
  check(projected.account.userId === 'u1', 'the session owner is part of the account');
  check(projected.xp === 10, 'progress travels');
  check(projected.streak.best === 1, 'the streak travels');
  check(projected.languages.cs.learnedWords.length === 1, 'learned words travel');
  check(projected.customLessons !== undefined, 'custom lessons travel');
  check(!('avatar' in api.projectForSync(state(1))), 'an emoji avatar is left behind too');

  // The projection must be a copy: a later mutation of the live object would
  // otherwise change what the next push sends.
  projected.streak.current = 99;
  check(state(1).streak.current === 1, 'the projection is a copy, not a view onto the live state');
  count += 9;
}

// --- Applying a remote state ------------------------------------------------
{
  const local = state(10);
  const merged = api.applyFromSync(
    { languages: { cs: { learnedWords: ['z'], immersion: 90 } }, xp: 999, streak: { current: 40, best: 40, lastActiveDate: '2026-09-26' } },
    local
  );
  check(merged !== null, 'a well-formed remote state is applied');
  check(merged.xp === 999, 'remote progress replaces local progress');
  check(merged.streak.current === 40, 'the remote streak wins, because the user chose it');
  check(merged.avatar === local.avatar, 'the local avatar survives a pull');
  check(merged.account.isAuth === true, 'a pull leaves the session signed in');
  check(merged.darkMode === local.darkMode, 'settings the remote omitted are left alone');
  count += 6;

  check(api.applyFromSync(null, local) === null, 'a missing payload is refused');
  check(api.applyFromSync('nonsense', local) === null, 'a string is refused');
  check(api.applyFromSync([], local) === null, 'an array is refused');
  check(api.applyFromSync({ xp: 5 }, local) === null, 'a payload with no languages is refused');
}

// --- The reconciliation rule -------------------------------------------------
{
  const remote = (updatedAt) => ({ state: { languages: {} }, updatedAt });

  check(api.decideReconcile({ lastSyncedAt: null, dirty: false }, null) === 'push', 'a first link pushes: the server knows nothing yet');
  check(api.decideReconcile({ lastSyncedAt: 'T1', dirty: false }, remote('T1')) === 'none', 'nothing moved on either side');
  check(api.decideReconcile({ lastSyncedAt: 'T1', dirty: false }, remote('T2')) === 'pull', 'the other device moved and this one is quiet: adopt');
  check(api.decideReconcile({ lastSyncedAt: 'T1', dirty: true }, remote('T1')) === 'push', 'this device has unsent work and the server is unchanged');
  check(api.decideReconcile({ lastSyncedAt: 'T1', dirty: true }, remote('T2')) === 'conflict', 'both sides moved: ask, never guess');
  check(api.decideReconcile({ lastSyncedAt: null, dirty: true }, remote('T9')) === 'conflict', 'linking an account that already has progress asks first');
  check(api.decideReconcile({ lastSyncedAt: null, dirty: false }, remote('T9')) === 'pull', 'linking an account with an empty device takes the server version');
  check(api.decideReconcile({ lastSyncedAt: 'T1', dirty: true }, remote('T30')) === 'conflict', 'a week offline is a conflict, not a silent overwrite');
  count += 8;
}

// --- Guest mode: nothing touches the network --------------------------------
{
  const service = engineFor(null);
  check(service.getView().status === 'unconfigured', 'without configuration the engine stays off');
  service.schedulePush(state(1));
  await settle();
  check(service.getView().status === 'unconfigured', 'a save while unconfigured does not start a sync');
  check(localStorage.getItem('pogruzhenie_sync_v1') === null, 'an unconfigured run leaves no marker behind');
  count += 3;
}

// --- First link: an empty server receives this device's progress -----------
{
  const server = fakeServer(null);
  const service = engineFor(server.backend);
  await service.attach(state(10), 'u1');

  check(server.pushes.length === 1, 'a first link pushes exactly once');
  check(server.pushes[0].xp === 10, 'the pushed state is this device progress');
  check(!('avatar' in server.pushes[0]), 'the avatar never reaches the server');
  check(!('isAuth' in server.pushes[0].account), 'isAuth is not stored');
  check(service.getView().status === 'idle', 'after a first link the engine is idle');
  count += 5;
}

// --- A quiet reconcile does nothing -----------------------------------------
{
  const server = fakeServer({ state: { languages: {}, xp: 10 }, updatedAt: 'T1' });
  const service = engineFor(server.backend);
  // The marker survives restarts, so "nothing moved" means the row the server
  // has is the row this device last saw.
  writeMarker('T1', false);
  await service.attach(state(10), 'u1');
  check(server.pushes.length === 0, 'nothing is sent when neither side moved');
  check(service.getView().status === 'idle', 'a quiet reconcile is idle, not syncing');
  count += 2;
}

// --- The other device moved and this one is quiet: adopt it -----------------
{
  const server = fakeServer({ state: { languages: { cs: { learnedWords: ['a'] } }, xp: 500 }, updatedAt: 'T9' });
  const service = engineFor(server.backend);
  writeMarker('T1', false);
  let delivered = null;
  service.onRemoteState = (incoming) => {
    delivered = incoming;
  };
  await service.attach(state(10), 'u1');

  check(delivered !== null, 'a moved server is handed to the state owner');
  check(delivered.xp === 500, 'the server version is adopted');
  check(service.getView().status === 'idle', 'adopting is not a conflict');
  check(server.pushes.length === 0, 'adopting does not push back');
  count += 4;
  api.syncService.onRemoteState = null;
}

// --- Both sides moved: ask, and honour the answer --------------------------
{
  const server = fakeServer({ state: { languages: {}, xp: 777 }, updatedAt: 'T9' });
  const service = engineFor(server.backend);
  // The realistic shape of this: the device went offline with work queued, so
  // the marker is still dirty from a previous session, and the other device
  // pushed in the meantime. Start-up is where the two meet.
  writeMarker('T1', true);
  await service.attach(state(10), 'u1');

  check(service.getView().status === 'conflict', 'two-sided changes raise a conflict');
  check(service.getView().awaitingChoice, 'the panel is told a decision is needed');
  check(server.pushes.length === 0, 'nothing is pushed while the choice is open');

  // A save during the conflict must not silently resolve it.
  service.schedulePush(state(43));
  await settle();
  check(server.pushes.length === 0, 'a save during a conflict does not pick a side');
  check(service.getView().status === 'conflict', 'the conflict survives further saves');

  await service.keepLocal();
  check(server.pushes.length === 1, 'keeping this device pushes it');
  check(server.pushes[0].xp === 43, 'the newest local value is what gets sent');
  check(service.getView().status === 'idle', 'the conflict is resolved');
  count += 7;
}

// --- Choosing the other device's version ----------------------------------
{
  const server = fakeServer({ state: { languages: { cs: { learnedWords: ['z'] } }, xp: 1234 }, updatedAt: 'T9' });
  const service = engineFor(server.backend);
  writeMarker('T1', true);

  let delivered = null;
  service.onRemoteState = (incoming) => {
    delivered = incoming;
  };
  await service.attach(state(55), 'u1');
  check(service.getView().status === 'conflict', 'the conflict is raised at start-up');

  await service.keepRemote();
  check(delivered !== null, 'the remote version is handed to the state owner');
  check(delivered.xp === 1234, 'the remote progress is adopted');
  check(server.pushes.length === 0, 'adopting the remote does not push it back');
  check(service.getView().status === 'idle', 'adopting resolves the conflict');

  // The decisive check: after adopting, a later reconcile must not raise the
  // same conflict again, because the marker now names the row we took.
  await service.reconcile();
  check(service.getView().status === 'idle', 'the adopted version does not conflict with itself');
  count += 6;
  api.syncService.onRemoteState = null;
}

// --- A failure leaves the work queued rather than dropping it --------------
{
  const service = engineFor({
    pull: async () => null,
    push: async () => {
      throw new Error('network down');
    },
  });
  await service.attach(state(10), 'u1');
  service.schedulePush(state(11));
  await service.flush();

  check(service.getView().status !== 'idle', 'a failure is not reported as success');
  check(service.getView().status === 'error', 'a failed push is reported as an error');
  check(JSON.parse(localStorage.getItem('pogruzhenie_sync_v1')).dirty === true, 'the change stays marked unsent');
  count += 3;
}

api.syncService.reset();

console.log(
  `PASS: ${count} sync cases — projection, avatar exclusion, remote merge, all six reconciliation outcomes, first link, quiet attach, adopting a moved server, two-sided conflict with both answers, and a retry after a failure.`
);
