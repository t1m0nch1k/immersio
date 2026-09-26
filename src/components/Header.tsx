import React, { useEffect, useRef, useState } from 'react';
import { UserState, LanguageCode } from '../types';
import { LANGUAGES } from '../data/languages';
import { audioService } from '../services/audioService';
import { getLocalDateKey } from '../services/storageService';
import { LANGUAGE_CODES } from '../utils';
import { isAvatarPhoto } from '../utils/avatar';
import { Route } from '../routes';

interface HeaderProps {
  userState: UserState;
  onNavigate: (route: Route) => void;
  onSelectLang: (lang: LanguageCode) => void;
  onToggleDarkMode: () => void;
  onOpenNav: () => void;
  onToggleSound: () => void;
  onOpenAuth: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  userState,
  onNavigate,
  onSelectLang,
  onToggleDarkMode,
  onToggleSound,
  onOpenNav,
  onOpenAuth,
}) => {
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const langPickerRef = useRef<HTMLDivElement>(null);
  const langButtonRef = useRef<HTMLButtonElement>(null);
  const currentLangObj = LANGUAGES[userState.currentLang] || LANGUAGES.en;
  const today = getLocalDateKey();
  const isStreakLit = userState.streak.lastActiveDate === today;

  const handleLangSelect = (code: LanguageCode) => {
    audioService.playClick();
    onSelectLang(code);
    setLangMenuOpen(false);
    langButtonRef.current?.focus();
  };

  // The menu is a plain absolutely positioned block, so `stopPropagation` on the
  // menu alone is not enough to keep it open while the rest of the page stays
  // interactive. Close it on an outside press and on Escape, and return focus to
  // the trigger so keyboard users do not lose their place.
  useEffect(() => {
    if (!langMenuOpen) return;

    const handleOutsidePress = (e: MouseEvent | TouchEvent) => {
      if (langPickerRef.current?.contains(e.target as Node)) return;
      setLangMenuOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setLangMenuOpen(false);
      langButtonRef.current?.focus();
    };

    document.addEventListener('mousedown', handleOutsidePress);
    document.addEventListener('touchstart', handleOutsidePress);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsidePress);
      document.removeEventListener('touchstart', handleOutsidePress);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [langMenuOpen]);

  return (
    <header>
      {/*
        The logo is the only control and it opens the menu. A separate burger
        button cost another 36px in a header that was already the widest part of
        the phone layout, and a burger drawn next to the brand read as two
        things to tap.
      */}
      <button
        type="button"
        className="logo"
        onClick={() => {
          audioService.playClick();
          onOpenNav();
        }}
        title="Меню"
        aria-label="Открыть меню разделов"
        aria-haspopup="true"
        style={{ background: 'none', border: 0, color: 'inherit' }}
      >
        <span className="mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" focusable="false">
            <path d="M2 8c3-3 5 3 8 0s5 3 8 0" />
            <path d="M2 13c3-3 5 3 8 0s5 3 8 0" />
            <path d="M2 18c3-3 5 3 8 0s5 3 8 0" />
          </svg>
        </span>
        <span className="logotext">ПОГРУЖЕНИЕ</span>
      </button>

      {/*
        One flex-1 group with space-evenly, instead of a flex:1 spacer followed
        by a pile of controls: the row now spans the full header width and the
        gaps come out equal on both screens.
      */}
      <div className="hgroup">
        {/* Language picker button */}
        <div style={{ position: 'relative' }} ref={langPickerRef}>
        <button
          ref={langButtonRef}
          type="button"
          className="hchip"
          aria-haspopup="menu"
          aria-expanded={langMenuOpen}
          onClick={() => {
            audioService.playClick();
            setLangMenuOpen((open) => !open);
          }}
        >
          <span>{currentLangObj.flag}</span>
          <b>{currentLangObj.code.toUpperCase()}</b>
          <span style={{ fontSize: '10px' }}>▼</span>
        </button>

        {langMenuOpen && (
          <div className="hmenu" role="menu" onClick={(e) => e.stopPropagation()}>
            {LANGUAGE_CODES.map((code) => {
              const lang = LANGUAGES[code];
              const prog = userState.languages[code];
              const learnedCount = prog ? prog.learnedWords.length : 0;
              return (
                <button
                  key={code}
                  type="button"
                  role="menuitem"
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
        className="hchip"
        type="button"
        onClick={() => onNavigate('profile')}
        title={isStreakLit ? 'Сегодня урок засчитан!' : 'Пройди урок сегодня, чтобы продлить стрик'}
      >
        <span className="fl">🔥</span>
        <b>{userState.streak.current}</b>
      </button>

      {/* XP chip */}
      <button className="hchip xp" type="button" onClick={() => onNavigate('profile')}>
        ⚡ <b>{userState.xp} XP</b>
      </button>

      {/* Dark mode toggle button */}
      <button
        className="iconbtn"
        type="button"
        onClick={() => {
          audioService.playClick();
          onToggleDarkMode();
        }}
        title="Сменить тему"
        aria-label="Сменить тему"
        style={{ width: '40px', height: '40px', fontSize: '18px' }}
      >
        {userState.darkMode ? '☀️' : '🌙'}
      </button>

      {/* Sound toggle button */}
      <button
        className="iconbtn"
        type="button"
        onClick={() => {
          audioService.playClick();
          onToggleSound();
        }}
        title={userState.soundEnabled ? 'Выключить звук' : 'Включить звук'}
        aria-label={userState.soundEnabled ? 'Выключить звук' : 'Включить звук'}
        aria-pressed={userState.soundEnabled}
        style={{ width: '40px', height: '40px', fontSize: '18px' }}
      >
        {userState.soundEnabled ? '🔊' : '🔇'}
      </button>

      {/* Auth / Avatar button */}
      {userState.account.isAuth ? (
        <button
          id="avbtn"
          type="button"
          onClick={() => onNavigate('profile')}
          title={`Профиль: ${userState.name}`}
          style={{ position: 'relative' }}
          className="avatarbtn"
        >
          {isAvatarPhoto(userState.avatar) ? (
            <img src={userState.avatar} alt="" />
          ) : (
            userState.avatar
          )}
        </button>
      ) : (
        <button
          className="btn small sun"
          type="button"
          onClick={() => {
            audioService.playClick();
            onOpenAuth();
          }}
        >
          Войти
        </button>
      )}
      </div>
    </header>
  );
};
