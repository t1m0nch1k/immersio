import React, { useEffect, useState } from 'react';
import { Icon } from './icons';
import { UserState } from '../types';
import { StorageService } from '../services/storageService';
import { audioService } from '../services/audioService';
import {
  hashPassword,
  isLegacyPasswordHash,
  isSecurePasswordStorageAvailable,
  verifyPassword,
} from '../services/passwordHash';

// Password hashing lives in src/services/passwordHash.ts so that StorageService.load
// can drop legacy digests too. See tests/pbkdf2.mjs.

interface AuthModalProps {
  userState: UserState;
  onUpdateState: (newState: UserState) => void;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px',
  border: '2px solid var(--ink)',
  borderRadius: '12px',
  marginTop: '4px',
  background: 'var(--card)',
  color: 'var(--ink)',
};

const labelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 800,
  textTransform: 'uppercase',
  color: 'var(--pine3)',
};

export const AuthModal: React.FC<AuthModalProps> = ({
  userState,
  onUpdateState,
  onClose,
  onShowToast,
}) => {
  const [tab, setTab] = useState<'login' | 'register'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Evaluated once: the capability cannot appear or disappear while the page lives.
  const [canStorePassword] = useState(isSecurePasswordStorageAvailable);

  const hasStoredCredentials = Boolean(userState.account.email && userState.account.passwordHash);

  // A legacy unsalted digest cannot be verified, so the credentials it protected
  // are dropped on the spot instead of being kept as a fake promise of safety.
  useEffect(() => {
    if (!isLegacyPasswordHash(userState.account.passwordHash)) return;
    userState.account = {
      ...userState.account,
      email: '',
      name: '',
      passwordHash: undefined,
      subscribedDate: undefined,
      subscriptionPlan: undefined,
      isAuth: false,
    };
    userState.name = '';
    StorageService.save(userState);
    onUpdateState({ ...userState });
    setNotice('Сохранённый пароль был в старом небезопасном формате, поэтому учётные данные сброшены. Зарегистрируйте профиль заново.');
    // Runs once on mount: this is a migration of the stored payload, not a reaction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openTab = (next: 'login' | 'register') => {
    setError('');
    setNotice('');
    setTab(next);
  };

  const finishAuth = (displayName: string, toast: string) => {
    userState.name = displayName;
    StorageService.save(userState);
    onUpdateState({ ...userState });
    onShowToast(toast);
    onClose();
  };

  const handlePasswordlessProfile = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    audioService.playSuccess();
    const fallbackName = email.trim().split('@')[0] || 'Студент';
    const displayName = name.trim() || fallbackName;
    userState.account = {
      ...userState.account,
      email: '',
      name: displayName,
      passwordHash: undefined,
      subscribedDate: undefined,
      subscriptionPlan: undefined,
      isAuth: true,
    };
    finishAuth(displayName, `👤 Локальный профиль «${displayName}» без пароля готов.`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || isSubmitting) return;
    if (!canStorePassword) return;

    setError('');
    setNotice('');
    setIsSubmitting(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const account = userState.account;

      if (tab === 'login') {
        if (account.email.toLowerCase() !== normalizedEmail) {
          setError('Неверный e-mail или пароль для локального профиля.');
          return;
        }
        if (!(await verifyPassword(password, account.passwordHash))) {
          setError('Неверный e-mail или пароль для локального профиля.');
          return;
        }
      }

      const passwordHash = await hashPassword(password);

      audioService.playSuccess();

      userState.account = {
        ...userState.account,
        email: normalizedEmail,
        name: tab === 'register'
          ? (name.trim() || normalizedEmail.split('@')[0] || 'Студент')
          : (userState.account.name || userState.name || normalizedEmail.split('@')[0] || 'Студент'),
        passwordHash,
        isAuth: true,
      };
      userState.name = userState.account.name;

      finishAuth(userState.name, tab === 'register'
        ? `🎉 Локальный профиль ${normalizedEmail} создан!`
        : `👋 С возвращением, ${userState.name}!`);
    } catch {
      setError('Браузер не смог безопасно обработать пароль. Создайте локальный профиль без пароля.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="ovl" onClick={onClose}>
      <div className="dlg" role="dialog" aria-modal="true" aria-labelledby="auth-dialog-title" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', background: 'var(--card)', padding: '6px', borderRadius: '14px', border: '2px solid var(--ink)' }}>
          <button
            type="button"
            className={`mi ${tab === 'register' ? 'cur' : ''}`}
            style={{ textAlign: 'center', justifyContent: 'center' }}
            onClick={() => openTab('register')}
          >
            Создать аккаунт
          </button>
          <button
            type="button"
            className={`mi ${tab === 'login' ? 'cur' : ''}`}
            style={{ textAlign: 'center', justifyContent: 'center' }}
            onClick={() => openTab('login')}
          >
            Войти
          </button>
        </div>

        <h2 id="auth-dialog-title" className="auth-title">
          {canStorePassword ? (
            tab === 'register' ? (
              <><Icon name="user" /> Регистрация</>
            ) : (
              <><Icon name="lock" /> Вход в профиль</>
            )
          ) : (
            <><Icon name="user" /> Локальный профиль</>
          )}
        </h2>
        <p className="sub" style={{ textAlign: 'center', margin: '0 auto 20px' }}>
          {!canStorePassword
            ? 'Пароль хранить небезопасно, но весь прогресс остаётся на устройстве.'
            : tab === 'register'
              ? 'Сохраняй выученные слова, стрик и прогресс на этом устройстве.'
              : 'Введи данные своей учётной записи.'}
        </p>

        {notice && (
          <div className="errorbox" role="status" style={{ marginTop: 0, marginBottom: '4px' }}>
            {notice}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {(tab === 'register' || !canStorePassword) && (
            <div>
              <label style={labelStyle}>Твоё имя</label>
              <input
                type="text"
                placeholder="Алексей"
                value={name}
                maxLength={20}
                onChange={(e) => setName(e.target.value)}
                style={inputStyle}
              />
            </div>
          )}

          {canStorePassword && (
            <>
              <div>
                <label style={labelStyle}>E-mail</label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="alexey@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Пароль</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  minLength={8}
                  autoComplete={tab === 'register' ? 'new-password' : 'current-password'}
                  onChange={(e) => setPassword(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </>
          )}

          {canStorePassword && tab === 'register' && (
            <p style={{ fontSize: '12px', color: 'var(--ink2)', margin: 0 }}>
              Пароль не сохраняется: он превращается в PBKDF2-хеш (210 000 итераций) со случайной солью. Забудешь пароль — профиль придётся создать заново.
            </p>
          )}

          {canStorePassword && tab === 'login' && !hasStoredCredentials && (
            <p style={{ fontSize: '12.5px', color: 'var(--ink2)', margin: 0 }}>
              На этом устройстве нет сохранённых учётных данных. Вход возможен только после регистрации.
            </p>
          )}

          {error && <div className="errorbox" role="alert">{error}</div>}

          {canStorePassword ? (
            <button className="btn sun big" type="submit" disabled={isSubmitting} style={{ marginTop: '14px' }}>
              {isSubmitting ? 'Проверка…' : tab === 'register' ? 'Зарегистрироваться →' : 'Войти в профиль →'}
            </button>
          ) : (
            <>
              <div className="errorbox" role="alert">
                Этот браузер не даёт доступ к безопасному хранению пароля: нет HTTPS (secure context) или Web Crypto. Мы не будем сохранять пароль в таком виде.
              </div>
              <button className="btn sun big" type="button" onClick={handlePasswordlessProfile} disabled={isSubmitting} style={{ marginTop: '14px' }}>
                {isSubmitting ? 'Готовим…' : 'Продолжить без пароля →'}
              </button>
            </>
          )}
        </form>

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button className="btn ghost" type="button" onClick={onClose}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
};
