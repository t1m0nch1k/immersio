import React, { useEffect, useState } from 'react';
import { Icon, type IconName } from './icons';
import { syncService } from '../services/syncService';
import { SyncStateView } from '../services/syncTypes';
import { audioService } from '../services/audioService';

interface SyncPanelProps {
  email: string;
  isAuth: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}

/**
 * Where sync lives in the UI.
 *
 * In the profile rather than the header: the header already carries five
 * controls and its density was a deliberate decision, and this panel is
 * somewhere you visit on purpose rather than something you glance at.
 *
 * The status line is not decoration. A mirror that silently stops updating is
 * worse than no mirror, so the panel always says which of the four things is
 * true: nothing to do, work queued, no connection, or two devices disagreeing.
 */
export const SyncPanel: React.FC<SyncPanelProps> = ({ email, isAuth, onSignIn, onSignOut }) => {
  const [view, setView] = useState<SyncStateView>(() => syncService.getView());

  useEffect(() => syncService.subscribe(setView), []);

  if (view.status === 'unconfigured') {
    return (
      <div className="card sync-panel" style={{ marginTop: '16px' }}>
        <div className="overline">синхронизация</div>
        <p className="sub" style={{ fontSize: '13.5px', margin: '6px 0 0' }}>
          Эта сборка собрана без облачного проекта. Прогресс хранится на этом устройстве.
        </p>
      </div>
    );
  }

  return (
    <div className="card sync-panel" style={{ marginTop: '16px' }}>
      <div className="sync-panel-head">
        <div>
          <div className="overline">синхронизация</div>
          <div style={{ fontSize: '16px', fontWeight: 700, marginTop: '4px' }}>
            {isAuth ? email : 'Гостевой режим'}
          </div>
        </div>
        {isAuth ? (
          <button className="btn small danger" type="button" onClick={onSignOut}>
            Выйти
          </button>
        ) : (
          <button className="btn small sun" type="button" onClick={onSignIn}>
            Войти через Google
          </button>
        )}
      </div>

      <div className={`sync-status sync-status-${view.status}`}>
        {statusIcon(view.status) && <Icon name={statusIcon(view.status)!} className="sm" />}
        <span>{view.message}</span>
      </div>

      {view.awaitingChoice && (
        <div className="sync-conflict">
          <p>
            На этом устройстве и на другом есть разный прогресс. Если выбрать один, второй будет
            заменён — отмены нет.
          </p>
          <div className="sync-conflict-actions">
            <button
              className="btn small sun"
              type="button"
              onClick={() => {
                audioService.playClick();
                void syncService.keepLocal();
              }}
            >
              Оставить этот
            </button>
            <button
              className="btn small"
              type="button"
              onClick={() => {
                audioService.playClick();
                void syncService.keepRemote();
              }}
            >
              Взять с другого
            </button>
          </div>
        </div>
      )}

      {(view.status === 'pending' || view.status === 'offline' || view.status === 'error') && isAuth && (
        <button
          className="btn small ghost sync-now"
          type="button"
          onClick={() => {
            audioService.playClick();
            void syncService.flush();
          }}
        >
          Синхронизировать сейчас
        </button>
      )}

      <p className="sync-note">
        Аватар остаётся на этом устройстве: он не отправляется в облако.
      </p>
    </div>
  );
};

/**
 * `null` for guest: the heading right above already says "Гостевой режим", and
 * a person glyph there reads as an avatar indicator rather than as "this is
 * only on this device". The states that can be wrong get a glyph; the default
 * one does not need one.
 */
const statusIcon = (status: SyncStateView['status']): IconName | null => {
  switch (status) {
    case 'idle':
      return 'check-circle';
    case 'pending':
    case 'syncing':
      return 'refresh';
    case 'offline':
    case 'error':
      return 'lock';
    case 'conflict':
      return 'external-link';
    default:
      return null;
  }
};
