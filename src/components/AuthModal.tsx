import React, { useState } from 'react';
import { UserState } from '../types';
import { StorageService } from '../services/storageService';
import { audioService } from '../services/audioService';

interface AuthModalProps {
  userState: UserState;
  onUpdateState: (newState: UserState) => void;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hashPassword = async (value: string): Promise<string> => {
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || isSubmitting) return;

    setError('');
    setIsSubmitting(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const passwordHash = await hashPassword(password);

      if (tab === 'login') {
        const account = userState.account;
        if (account.email.toLowerCase() !== normalizedEmail || account.passwordHash !== passwordHash) {
          setError('Неверный e-mail или пароль для локального профиля.');
          return;
        }
      }

      audioService.playSuccess();

      userState.account = {
        ...userState.account,
        email: normalizedEmail,
        name: tab === 'register'
          ? (name.trim() || normalizedEmail.split('@')[0] || 'Студент')
          : (userState.account.name || userState.name || normalizedEmail.split('@')[0] || 'Студент'),
        passwordHash: tab === 'register' ? passwordHash : userState.account.passwordHash,
        isAuth: true,
      };
      userState.name = userState.account.name;

      StorageService.save(userState);
      onUpdateState({ ...userState });

      if (tab === 'register') {
        onShowToast(`🎉 Локальный профиль ${normalizedEmail} создан!`);
      } else {
        onShowToast(`👋 С возвращением, ${userState.name}!`);
      }

      onClose();
    } catch {
      setError('Не удалось обработать пароль в этом браузере.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="ovl" onClick={onClose}>
      <div className="dlg" role="dialog" aria-modal="true" aria-labelledby="auth-dialog-title" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', background: 'var(--card)', padding: '6px', borderRadius: '14px', border: '2px solid var(--ink)' }}>
          <button
            className={`mi ${tab === 'register' ? 'cur' : ''}`}
            style={{ textAlign: 'center', justifyContent: 'center' }}
            onClick={() => {
              setError('');
              setTab('register');
            }}
          >
            Создать аккаунт
          </button>
          <button
            className={`mi ${tab === 'login' ? 'cur' : ''}`}
            style={{ textAlign: 'center', justifyContent: 'center' }}
            onClick={() => {
              setError('');
              setTab('login');
            }}
          >
            Войти
          </button>
        </div>

        <h2 id="auth-dialog-title" style={{ fontFamily: 'Unbounded', fontSize: '22px', marginBottom: '8px', textAlign: 'center' }}>
          {tab === 'register' ? 'Регистрация 🎒' : 'Вход в профиль 🔐'}
        </h2>
        <p className="sub" style={{ textAlign: 'center', margin: '0 auto 20px' }}>
          {tab === 'register'
            ? 'Сохраняй выученные слова, стрик и прогресс на этом устройстве.'
            : 'Введи данные своей учётной записи.'}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {tab === 'register' && (
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--pine3)' }}>
                Твоё имя
              </label>
              <input
                type="text"
                required
                placeholder="Алексей"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ width: '100%', padding: '12px', border: '2px solid var(--ink)', borderRadius: '12px', marginTop: '4px', background: 'var(--card)', color: 'var(--ink)' }}
              />
            </div>
          )}

          <div>
            <label style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--pine3)' }}>
              E-mail
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="alexey@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '12px', border: '2px solid var(--ink)', borderRadius: '12px', marginTop: '4px', background: 'var(--card)', color: 'var(--ink)' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--pine3)' }}>
              Пароль
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              minLength={8}
              autoComplete={tab === 'register' ? 'new-password' : 'current-password'}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '12px', border: '2px solid var(--ink)', borderRadius: '12px', marginTop: '4px', background: 'var(--card)', color: 'var(--ink)' }}
            />
          </div>

          {error && <div className="errorbox" role="alert">{error}</div>}

          <button className="btn sun big" type="submit" disabled={isSubmitting} style={{ marginTop: '14px' }}>
            {isSubmitting ? 'Проверка…' : tab === 'register' ? 'Зарегистрироваться →' : 'Войти в профиль →'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button className="btn ghost" onClick={onClose}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
};
