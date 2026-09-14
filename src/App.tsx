import React, { useState, useEffect, useRef } from 'react';
import { UserState, Word, Lesson, LanguageCode } from './types';
import { LESSONS } from './data/lessons';
import { LANGUAGES } from './data/languages';
import { StorageService } from './services/storageService';
import { audioService } from './services/audioService';

import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { LessonList } from './components/LessonList';
import { GrammarView } from './components/GrammarView';
import { AlphabetView } from './components/AlphabetView';
import { WordCardModal } from './components/WordCardModal';
import { AuthModal } from './components/AuthModal';

const ReaderView = React.lazy(() => import('./components/ReaderView').then((module) => ({ default: module.ReaderView })));
const CustomTextImport = React.lazy(() => import('./components/CustomTextImport').then((module) => ({ default: module.CustomTextImport })));
const PracticeView = React.lazy(() => import('./components/PracticeView').then((module) => ({ default: module.PracticeView })));
const WordSprintView = React.lazy(() => import('./components/WordSprintView').then((module) => ({ default: module.WordSprintView })));
const ListeningView = React.lazy(() => import('./components/ListeningView').then((module) => ({ default: module.ListeningView })));
const DictView = React.lazy(() => import('./components/DictView').then((module) => ({ default: module.DictView })));
const ProfileView = React.lazy(() => import('./components/ProfileView').then((module) => ({ default: module.ProfileView })));
const OnboardingModal = React.lazy(() => import('./components/OnboardingModal').then((module) => ({ default: module.OnboardingModal })));

export const App: React.FC = () => {
  const [userState, setUserState] = useState<UserState>(() => StorageService.load());
  const [currentRoute, setCurrentRoute] = useState<string>('lessons');
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);

  // Word Popup Card State
  const [popupWord, setPopupWord] = useState<{ word: Word; position: { left: number; top: number } } | null>(null);

  // Modals State
  const [showOnboarding, setShowOnboarding] = useState<boolean>(!userState.onboarded);
  const [isRetakeOnly, setIsRetakeOnly] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);

  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 2800);
  };

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  // Sync dark mode setting to body attribute
  useEffect(() => {
    if (userState.darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [userState.darkMode]);

  // Sync sound settings
  useEffect(() => {
    audioService.setSoundEnabled(userState.soundEnabled);
  }, [userState.soundEnabled]);

  // Background floating letters generator
  useEffect(() => {
    const box = document.getElementById('bgletters');
    if (!box) return;

    box.innerHTML = '';
    const currentLangObj = LANGUAGES[userState.currentLang] || LANGUAGES.en;
    const letters = currentLangObj.bgLetters;

    for (let i = 0; i < 16; i++) {
      const span = document.createElement('span');
      span.textContent = letters[i % letters.length];
      span.style.left = `${Math.random() * 96}%`;
      span.style.top = `${Math.random() * 92}%`;
      span.style.fontSize = `${26 + Math.random() * 54}px`;
      span.style.animationDuration = `${9 + Math.random() * 12}s`;
      span.style.animationDelay = `-${Math.random() * 10}s`;
      box.appendChild(span);
    }
  }, [userState.currentLang]);

  // Navigation handler
  const handleNavigate = (route: string) => {
    setPopupWord(null);
    setCurrentRoute(route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenLesson = (lessonId: string) => {
    setPopupWord(null);
    setActiveLessonId(lessonId);
    setCurrentRoute('reader');
    window.scrollTo({ top: 0 });
  };

  const handleSelectLang = (code: LanguageCode) => {
    StorageService.ensureLangProgress(userState, code);
    userState.currentLang = code;
    StorageService.save(userState);
    setUserState({ ...userState });
    showToast(`Переключено на: ${LANGUAGES[code].flag} ${LANGUAGES[code].name}`);
  };

  const handleToggleDarkMode = () => {
    userState.darkMode = !userState.darkMode;
    StorageService.save(userState);
    setUserState({ ...userState });
  };

  const handleUpdateImmersion = (val: number) => {
    const langProg = StorageService.ensureLangProgress(userState, userState.currentLang);
    langProg.immersion = val;
    StorageService.save(userState);
    StorageService.checkAndUnlockAchievements(userState, showToast);
    setUserState({ ...userState });
  };

  const handleLearnWord = (wordId: string) => {
    const lang = userState.currentLang;
    const langProg = StorageService.ensureLangProgress(userState, lang);
    // Store the canonical dictionary id exactly once. A popup can be opened
    // from an inflected native-language token, so normalize the id before
    // saving it; otherwise the next render sees the same word as "new" again.
    const canonicalWordId = wordId.trim();
    // Unknown foreign tokens are playable, but they do not have a reliable
    // Russian translation. Never persist their old temporary `w_...` ids as
    // learned words, otherwise practice can receive an empty dictionary item.
    if (!canonicalWordId || canonicalWordId.startsWith('w_')) return;
    if (canonicalWordId && !langProg.learnedWords.includes(canonicalWordId)) {
      const updatedLearned = [...langProg.learnedWords, canonicalWordId];
      const updatedProg = {
        ...langProg,
        learnedWords: updatedLearned,
      };
      const updatedLanguages = {
        ...userState.languages,
        [lang]: updatedProg,
      };
      const updatedState: UserState = {
        ...userState,
        xp: userState.xp + 2,
        languages: updatedLanguages,
      };
      StorageService.save(updatedState);
      StorageService.checkAndUnlockAchievements(updatedState, showToast);
      setUserState(updatedState);
      showToast(`Слово добавлено в словарь! (+2 XP)`);
    }
  };

  const handleForgetWord = (wordId: string) => {
    const lang = userState.currentLang;
    const langProg = StorageService.ensureLangProgress(userState, lang);
    const updatedLearned = langProg.learnedWords.filter((id) => id !== wordId);
    const updatedProg = {
      ...langProg,
      learnedWords: updatedLearned,
    };
    const updatedLanguages = {
      ...userState.languages,
      [lang]: updatedProg,
    };
    const updatedState: UserState = {
      ...userState,
      languages: updatedLanguages,
    };
    StorageService.save(updatedState);
    setUserState(updatedState);
    setPopupWord(null);
    showToast('Слово удалено из словаря');
  };

  const handleSaveCustomLesson = (customLesson: Lesson) => {
    setActiveLessonId(customLesson.id);
    setCurrentRoute('reader');
    setUserState({ ...userState });
    showToast(`Свой урок «${customLesson.title}» создан! 🎉`);
  };

  const handleResetProgress = () => {
    if (window.confirm('Точно сбросить весь прогресс? Это действие необратимо.')) {
      StorageService.reset();
      window.location.reload();
    }
  };

  // Find active lesson object
  const allLessons = [...LESSONS, ...userState.customLessons];
  const activeLesson = allLessons.find((l) => l.id === activeLessonId) || LESSONS[0];
  const currentLangProg = StorageService.getLangProgress(userState, userState.currentLang);
  const isPopupWordLearned = popupWord ? currentLangProg.learnedWords.includes(popupWord.word.id) : false;

  return (
    <div onClick={() => setPopupWord(null)}>
      <div id="bgletters"></div>

      {/* Header */}
      <Header
        userState={userState}
        onNavigate={handleNavigate}
        onSelectLang={handleSelectLang}
        onToggleDarkMode={handleToggleDarkMode}
        onOpenAuth={() => setShowAuthModal(true)}
      />

      {/* Layout Shell */}
      <div className="shell">
        {/* Sidebar */}
        <Sidebar
          currentRoute={currentRoute}
          userState={userState}
          onNavigate={handleNavigate}
          onUpdateImmersion={handleUpdateImmersion}
        />

        {/* Main Content Router */}
        <React.Suspense fallback={<div className="view route-loading"><div className="overline">загрузка раздела</div><h1 className="display">Подготавливаем материалы…</h1></div>}>
        <main>
          {currentRoute === 'lessons' && (
            <LessonList
              userState={userState}
              lessons={LESSONS}
              onOpenLesson={handleOpenLesson}
              onNavigateCustom={() => handleNavigate('custom')}
              onUpdateState={(updated) => setUserState({ ...updated })}
              onNavigate={handleNavigate}
            />
          )}

          {currentRoute === 'reader' && (
            <ReaderView
              lesson={activeLesson}
              userState={userState}
              onNavigate={handleNavigate}
              onLearnWord={handleLearnWord}
              onForgetWord={handleForgetWord}
              onOpenWordPopup={(word, rect) => {
                let x = Math.min(Math.max(12, rect.left + rect.width / 2 - 140), window.innerWidth - 290);
                let y = rect.bottom + 10;
                if (y + 230 > window.innerHeight) {
                  y = Math.max(10, rect.top - 240);
                }
                setPopupWord({ word, position: { left: x, top: y } });
              }}
              onUpdateState={(updated) => setUserState({ ...updated })}
            />
          )}

          {currentRoute === 'custom' && (
            <CustomTextImport
              userState={userState}
              onSaveCustomLesson={handleSaveCustomLesson}
              onNavigate={handleNavigate}
            />
          )}

          {currentRoute === 'practice' && (
            <PracticeView
              userState={userState}
              onUpdateState={(updated) => setUserState({ ...updated })}
              onNavigate={handleNavigate}
            />
          )}

          {currentRoute === 'sprint' && (
            <WordSprintView
              userState={userState}
              onUpdateState={(updated) => setUserState({ ...updated })}
              onNavigate={handleNavigate}
            />
          )}

          {currentRoute === 'listening' && (
            <ListeningView
              userState={userState}
              onUpdateState={(updated) => setUserState({ ...updated })}
              onNavigate={handleNavigate}
            />
          )}

          {currentRoute === 'dict' && (
            <DictView
              userState={userState}
              onNavigate={handleNavigate}
              onLearnWord={handleLearnWord}
              onForgetWord={handleForgetWord}
            />
          )}

          {currentRoute === 'dict-all' && (
            <DictView
              userState={userState}
              showAllWords
              onNavigate={handleNavigate}
              onLearnWord={handleLearnWord}
              onForgetWord={handleForgetWord}
            />
          )}

          {currentRoute === 'grammar' && (
            <GrammarView key={userState.currentLang} userState={userState} onNavigate={handleNavigate} onUpdateState={(updated) => setUserState({ ...updated })} />
          )}

          {currentRoute === 'alphabet' && (
            <AlphabetView userState={userState} onNavigate={handleNavigate} />
          )}

          {currentRoute === 'profile' && (
            <ProfileView
              userState={userState}
              onUpdateState={(updated) => setUserState({ ...updated })}
              onRetakeTest={() => {
                setIsRetakeOnly(true);
                setShowOnboarding(true);
              }}
              onResetProgress={handleResetProgress}
              onOpenAuth={() => setShowAuthModal(true)}
            />
          )}
        </main>
        </React.Suspense>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mbar">
        <button
          className={currentRoute === 'lessons' ? 'active' : ''}
          onClick={() => handleNavigate('lessons')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5v13z" />
          </svg>
          Уроки
        </button>

        <button
          className={currentRoute === 'practice' ? 'active' : ''}
          onClick={() => handleNavigate('practice')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="4" />
          </svg>
          Практика
        </button>

        <button
          className={currentRoute === 'listening' ? 'active' : ''}
          onClick={() => handleNavigate('listening')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 13a8 8 0 0 1 16 0" />
            <path d="M4 13v4a2 2 0 0 0 2 2h1v-7H6a2 2 0 0 0-2 2zM20 13v4a2 2 0 0 1-2 2h-1v-7h1a2 2 0 0 1 2 2z" />
            <path d="M12 5v2" />
          </svg>
          Слушание
        </button>

        <button
          className={currentRoute === 'dict' || currentRoute === 'dict-all' ? 'active' : ''}
          onClick={() => handleNavigate('dict')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 6c-2-1.8-5-2-8-2v14c3 0 6 .2 8 2 2-1.8 5-2 8-2V4c-3 0-6 .2-8 2z" />
          </svg>
          Словарь
        </button>

        <button
          className={currentRoute === 'grammar' ? 'active' : ''}
          onClick={() => handleNavigate('grammar')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v14H6.5A2.5 2.5 0 0 0 4 19.5z" />
            <path d="M8 7h8M8 11h6" />
          </svg>
          Грамматика
        </button>

        <button
          className={currentRoute === 'alphabet' ? 'active' : ''}
          onClick={() => handleNavigate('alphabet')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 19 9 5l5 14M6 14h6" />
            <path d="M16 5h4M18 5v14M15 19h6" />
          </svg>
          Алфавит
        </button>

        <button
          className={currentRoute === 'custom' ? 'active' : ''}
          onClick={() => handleNavigate('custom')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          </svg>
          Свой текст
        </button>

        <button
          className={currentRoute === 'profile' ? 'active' : ''}
          onClick={() => handleNavigate('profile')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c1.5-4 5-5.5 8-5.5s6.5 1.5 8 5.5" />
          </svg>
          Профиль
        </button>
      </nav>

      {/* Floating Word Card Popup */}
      {popupWord && (
        <WordCardModal
          word={popupWord.word}
          position={popupWord.position}
          isLearned={isPopupWordLearned}
          currentLang={userState.currentLang}
          onLearn={(wordId) => {
            handleLearnWord(wordId);
            setPopupWord(null);
          }}
          onForget={(wordId) => {
            handleForgetWord(wordId);
            setPopupWord(null);
          }}
          onClose={() => setPopupWord(null)}
        />
      )}

      {/* Onboarding Modal */}
      {showOnboarding && (
        <React.Suspense fallback={null}>
          <OnboardingModal
            userState={userState}
            isRetakeOnly={isRetakeOnly}
            onComplete={(newState) => {
              setUserState({ ...newState });
              setShowOnboarding(false);
              setIsRetakeOnly(false);
            }}
            onClose={() => {
              setShowOnboarding(false);
              setIsRetakeOnly(false);
            }}
          />
        </React.Suspense>
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          userState={userState}
          onUpdateState={(updated) => setUserState({ ...updated })}
          onClose={() => setShowAuthModal(false)}
          onShowToast={showToast}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && <div className="toast" role="status" aria-live="polite">{toastMessage}</div>}
    </div>
  );
};
