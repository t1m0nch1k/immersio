import React, { useState } from 'react';
import { Icon } from './icons';
import { signInWithGoogle } from '../services/supabaseAuth';
import { isSyncConfigured } from '../services/supabase';

interface AuthModalProps {
  /** How much this device already has, so the copy can be honest about it. */
  localWordCount: number;
  onClose: () => void;
  onStartSignIn: () => void;
}

/**
 * The sign-in dialog.
 *
 * There is no form. The app keeps no password of its own: Google is the only
 * credential, and Supabase holds the session. That removes the form, the
 * password strength question, the "you will have to re-register if you forget
 * it" warning and the client-side PBKDF2 — the local profile those served is
 * gone, not merely hidden.
 *
 * What is left to explain is the one thing a guest has a right to know before
 * signing in: what happens to the progress already on this device.
 */
export const AuthModal: React.FC<AuthModalProps> = ({ localWordCount, onClose, onStartSignIn }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const configured = isSyncConfigured();

  const handleSignIn = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    const result = await signInWithGoogle();
    if (result.started) {
      // The consent screen is opening. Whatever happens next arrives through the
      // redirect handler, so this dialog has nothing left to do.
      onStartSignIn();
      return;
    }
    setBusy(false);
    setError(
      result.reason === 'not-configured'
        ? 'Облачная синхронизация не настроена в этой сборке.'
        : 'Не удалось открыть вход через Google. Попробуй ещё раз.'
    );
  };

  return (
    <div className="ovl" onClick={onClose}>
      <div
        className="dlg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-dialog-title"
        style={{ maxWidth: '440px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="auth-dialog-title" className="auth-title">
          <Icon name="user" /> Синхронизация
        </h2>

        <p className="sub" style={{ textAlign: 'center', margin: '0 auto 20px' }}>
          Войди через Google, чтобы прогресс появился на всех устройствах. Приложение продолжит
          работать и без входа.
        </p>

        <div className="card" style={{ padding: '14px 16px', marginBottom: '16px' }}>
          <div className="overline">что уже есть на этом устройстве</div>
          <p style={{ margin: '6px 0 0', fontSize: '13.5px' }}>
            {localWordCount > 0
              ? `${localWordCount} ${plural(localWordCount, 'слово', 'слова', 'слов')} в личном словаре, стрик и история занятий. При первом входе они отправятся в облако.`
              : 'Прогресса пока нет. При первом входе облако начнёт сохранять всё, что ты выучишь.'}
          </p>
        </div>

        {!configured && (
          <div className="errorbox" role="status">
            Эта сборка собрана без параметров Supabase, поэтому вход недоступен. Прогресс остаётся
            на устройстве.
          </div>
        )}

        {error && <div className="errorbox" role="alert">{error}</div>}

        <button
          className="btn sun big"
          type="button"
          onClick={handleSignIn}
          disabled={busy || !configured}
          style={{ marginTop: '14px', width: '100%' }}
        >
          {busy ? 'Открываем…' : 'Войти через Google →'}
        </button>

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button className="btn ghost" type="button" onClick={onClose}>
            Не сейчас
          </button>
        </div>
      </div>
    </div>
  );
};

const plural = (count: number, one: string, few: string, many: string): string => {
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 14) return many;
  switch (count % 10) {
    case 1:
      return one;
    case 2:
    case 3:
    case 4:
      return few;
    default:
      return many;
  }
};
