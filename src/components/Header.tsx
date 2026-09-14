import React, { useState } from 'react';
import { UserState, LanguageCode } from '../types';
import { LANGUAGES } from '../data/languages';
import { audioService } from '../services/audioService';
import { getLocalDateKey } from '../services/storageService';

interface HeaderProps {
  userState: UserState;
  onNavigate: (route: string) => void;
  onSelectLang: (lang: LanguageCode) => void;
  onToggleDarkMode: () => void;
  onOpenAuth: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  userState,
  onNavigate,
  onSelectLang,
  onToggleDarkMode,
  onOpenAuth,
}) => {
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const currentLangObj = LANGUAGES[userState.currentLang] || LANGUAGES.en;
  const today = getLocalDateKey();
  const isStreakLit = userState.streak.lastActiveDate === today;

  const handleLangSelect = (code: LanguageCode) => {
    audioService.playClick();
    onSelectLang(code);
    setLangMenuOpen(false);
  };

  return (
    <header>
      <div className="logo" onClick={() => onNavigate('lessons')}>
        <div className="mark">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M2 8c3-3 5 3 8 0s5 3 8 0"/>
            <path d="M2 13c3-3 5 3 8 0s5 3 8 0"/>
            <path d="M2 18c3-3 5 3 8 0s5 3 8 0"/>
          </svg>
        </div>
        ПОГРУЖЕНИЕ
      </div>

      <div className="hspace"></div>

      {/* Language picker button */}
      <div style={{ position: 'relative' }}>
        <button
          className="hchip"
          onClick={() => {
            audioService.playClick();
            setLangMenuOpen(!langMenuOpen);
          }}
        >
          <span>{currentLangObj.flag}</span>
          <b>{currentLangObj.code.toUpperCase()}</b>
          <span style={{ fontSize: '10px' }}>▼</span>
        </button>

        {langMenuOpen && (
          <div className="hmenu" onClick={(e) => e.stopPropagation()}>
            {(Object.keys(LANGUAGES) as LanguageCode[]).map((code) => {
              const lang = LANGUAGES[code];
              const prog = userState.languages[code];
              const learnedCount = prog ? prog.learnedWords.length : 0;
              return (
                <button
                  key={code}
                  className={`mi ${code === userState.currentLang ? 'cur' : ''}`}
                  onClick={() => handleLangSelect(code)}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.name}</span>
                  <small>{learnedCount > 0 ? `${learnedCount} слов` : 'новый'}</small>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Streak chip */}
      <button
        className={`hchip ${isStreakLit ? 'lit' : ''}`}
        onClick={() => onNavigate('profile')}
        title={isStreakLit ? 'Сегодня урок засчитан!' : 'Пройди урок сегодня, чтобы продлить стрик'}
      >
        <span className="fl">🔥</span>
        <b>{userState.streak.current}</b>
      </button>

      {/* XP chip */}
      <button className="hchip xp" onClick={() => onNavigate('profile')}>
        ⚡ <b>{userState.xp} XP</b>
      </button>

      {/* Dark mode toggle button */}
      <button
        className="iconbtn"
        onClick={() => {
          audioService.playClick();
          onToggleDarkMode();
        }}
        title="Сменить тему"
        style={{ width: '40px', height: '40px', fontSize: '18px' }}
      >
        {userState.darkMode ? '☀️' : '🌙'}
      </button>

      {/* Auth / Avatar button */}
      {userState.account.isAuth ? (
        <button
          id="avbtn"
          onClick={() => onNavigate('profile')}
          title={`Профиль: ${userState.name}`}
          style={{ position: 'relative' }}
        >
          {userState.avatar}
          </button>
      ) : (
        <button
          className="btn small sun"
          onClick={() => {
            audioService.playClick();
            onOpenAuth();
          }}
        >
          Войти
        </button>
      )}
    </header>
  );
};
