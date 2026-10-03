import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { UserState, Word, Lesson, LanguageCode } from './types';
import { LESSONS } from './data/lessons';
import { LANGUAGES } from './data/languages';
import { StorageService } from './services/storageService';
import { noteManualImmersion } from './services/immersionProfile';
import { audioService } from './services/audioService';
import { toastService } from './services/toastService';
import { syncService } from './services/syncService';
import { getSupabase, isSyncConfigured } from './services/supabase';
import {
  completeGoogleSignIn,
  currentSession,
  isAuthRedirect,
  onAuthRedirect,
  signOut,
} from './services/supabaseAuth';
import type { User } from '@supabase/supabase-js';

import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { LessonList } from './components/LessonList';
import { WordCardModal } from './components/WordCardModal';
import { AuthModal } from './components/AuthModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Route } from './routes';

// The grammar and alphabet datasets cover all eight languages, so they are
// loaded on demand instead of shipping in the entry chunk.
const GrammarView = React.lazy(() => import('./components/GrammarView').then((module) => ({ default: module.GrammarView })));
const AlphabetView = React.lazy(() => import('./components/AlphabetView').then((module) => ({ default: module.AlphabetView })));
const ReaderView = React.lazy(() => import('./components/ReaderView').then((module) => ({ default: module.ReaderView })));
const CustomTextImport = React.lazy(() => import('./components/CustomTextImport').then((module) => ({ default: module.CustomTextImport })));
const PracticeView = React.lazy(() => import('./components/PracticeView').then((module) => ({ default: module.PracticeView })));
const WordSprintView = React.lazy(() => import('./components/WordSprintView').then((module) => ({ default: module.WordSprintView })));
const ListeningView = React.lazy(() => import('./components/ListeningView').then((module) => ({ default: module.ListeningView })));
const DictView = React.lazy(() => import('./components/DictView').then((module) => ({ default: module.DictView })));
const ProfileView = React.lazy(() => import('./components/ProfileView').then((module) => ({ default: module.ProfileView })));
const OnboardingModal = React.lazy(() => import('./components/OnboardingModal').then((module) => ({ default: module.OnboardingModal })));

const BACKGROUND_LETTER_COUNT = 16;

/**
 * What to call the person.
 *
 * Google's display name is the one thing about an account that needs no
 * translation, and it is the only name the app ever stores now that there is no
 * local profile to type one into.
 */
const resolveDisplayName = (user: User): string => {
  const fromProvider = user.user_metadata?.full_name ?? user.user_metadata?.name;
  if (typeof fromProvider === 'string' && fromProvider.trim()) return fromProvider.trim();
  const email = user.email ?? '';
  return email.split('@')[0] || 'Студент';
};

interface BackgroundLetters {
  letter: string;
  left: number;
  top: number;
  fontSize: number;
  duration: number;
  delay: number;
}

const buildBackgroundLetters = (lang: LanguageCode): BackgroundLetters[] => {
  const letters = (LANGUAGES[lang] || LANGUAGES.en).bgLetters;
  return Array.from({ length: BACKGROUND_LETTER_COUNT }, (_, index) => ({
    letter: letters[index % letters.length],
    left: Math.random() * 96,
    top: Math.random() * 92,
    fontSize: 26 + Math.random() * 54,
    duration: 9 + Math.random() * 12,
    delay: Math.random() * 10,
  }));
};

const RouteFallback: React.FC = () => (
  <div className="view">
    <div className="overline">загрузка раздела</div>
    <h1 className="display">Подготавливаем материалы…</h1>
  </div>
);

export const App: React.FC = () => {
  const [userState, setUserState] = useState<UserState>(() => StorageService.load());
  const [currentRoute, setCurrentRoute] = useState<Route>('lessons');
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [isNavOpen, setIsNavOpen] = useState<boolean>(false);

  // Word Popup Card State
  const [popupWord, setPopupWord] = useState<{ word: Word; position: { left: number; top: number } } | null>(null);

  // Modals State
  const [showOnboarding, setShowOnboarding] = useState<boolean>(!userState.onboarded);
  const [isRetakeOnly, setIsRetakeOnly] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);

  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 2800);
  }, []);

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  // Screens publish achievement and reward notifications through the bus.
  useEffect(() => toastService.subscribe(showToast), [showToast]);

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

  // Background floating letters, recomputed only when the language changes.
  const backgroundLetters = useMemo(
    () => buildBackgroundLetters(userState.currentLang),
    [userState.currentLang]
  );

  /*
   * Progress mirror.
   *
   * `App` owns the only `UserState` in the app, so it is also the only place
   * that can hand a state pulled from the server to `localStorage` and re-render
   * from it. The hook is registered here rather than inside `syncService`
   * because that module has no business knowing how the app stores state.
   */
  useEffect(() => {
    syncService.onRemoteState = (incoming) => {
      StorageService.save(incoming);
      setUserState({ ...incoming });
    };
    return () => {
      syncService.onRemoteState = null;
    };
  }, []);

  // Every local save is offered to the mirror. Registered after the state owner
  // so a save triggered while attaching cannot recurse.
  useEffect(() => {
    StorageService.onSave((state) => syncService.schedulePush(state));
    return () => StorageService.onSave(null);
  }, []);

  /**
   * Establishes the session on start-up and resolves whatever the redirect left
   * behind.
   *
   * `useState`'s initialiser has to stay synchronous, so this cannot be part of
   * loading the state: the app renders from localStorage immediately and the
   * session is layered on top a tick later.
   */
  useEffect(() => {
    let cancelled = false;

    const applySession = async (user: User) => {
      if (cancelled) return;
      const displayName = resolveDisplayName(user);
      const current = StorageService.load();
      const wasGuest = !current.account.isAuth;
      const linkedElsewhere = Boolean(current.account.userId) && current.account.userId !== user.id;

      current.account = {
        ...current.account,
        email: user.email ?? '',
        name: displayName,
        userId: user.id,
        isAuth: true,
      };
      if (wasGuest && !current.name) current.name = displayName;
      StorageService.save(current);
      if (!cancelled) setUserState({ ...current });
      await syncService.attach(current, user.id);
      if (linkedElsewhere) {
        showToast('Аккаунт изменён: прогресс этого устройства теперь виден в новом аккаунте.');
      }
    };

    const start = async () => {
      if (!isSyncConfigured()) {
        await syncService.attach(userState, null);
        return;
      }
      const client = getSupabase();
      if (!client) return;

      // The handler is installed before anything can redirect, because on a
      // cold start the redirect arrives while this module is still loading and a
      // handler added afterwards would never see it.
      onAuthRedirect((url) => {
        if (cancelled || !isAuthRedirect(url)) return;
        void completeGoogleSignIn(client, url).then(applySession).catch((error: unknown) => {
          showToast(error instanceof Error ? error.message : 'Вход не завершился.');
        });
      });

      // A web sign-in returns to the site URL with the code in the query string.
      if (isAuthRedirect(window.location.href)) {
        window.history.replaceState({}, '', window.location.pathname);
        try {
          await applySession(await completeGoogleSignIn(client, window.location.href));
        } catch (error) {
          showToast(error instanceof Error ? error.message : 'Вход не завершился.');
        }
        return;
      }

      const session = await currentSession(client);
      if (cancelled) return;
      if (session?.user) {
        await applySession(session.user);
      } else {
        await syncService.attach(userState, null);
      }
    };

    void start();
    return () => {
      cancelled = true;
    };
    // Runs once. `userState` is read as the starting value only; re-running on
    // every change would re-authenticate on each keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSignOut = useCallback(async () => {
    audioService.playClick();
    // Order matters. Flushing first gets whatever the last few seconds of
    // work out to the server; signing out first would leave a queued change with
    // no valid session to send it and quietly discard it.
    await syncService.detach();
    if (isSyncConfigured()) {
      const client = getSupabase();
      if (client) await signOut(client);
    }
    const next = StorageService.load();
    // Only the credentials go. `name` is the learner's own, editable in the
    // profile, and is not derived from the account any more.
    next.account = {
      ...next.account,
      email: '',
      name: '',
      userId: undefined,
      isAuth: false,
    };
    StorageService.save(next);
    setUserState({ ...next });
    showToast('Выполнен выход. Прогресс остался на этом устройстве.');
  }, [showToast]);

  // Navigation handler
  const handleNavigate = useCallback((route: Route) => {
    setPopupWord(null);
    setCurrentRoute(route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleOpenLesson = useCallback((lessonId: string) => {
    setPopupWord(null);
    setActiveLessonId(lessonId);
    setCurrentRoute('reader');
    window.scrollTo({ top: 0 });
  }, []);

  const handleSelectLang = useCallback((code: LanguageCode) => {
    StorageService.ensureLangProgress(userState, code);
    userState.currentLang = code;
    StorageService.save(userState);
    setUserState({ ...userState });
    showToast(`Переключено на: ${LANGUAGES[code].flag} ${LANGUAGES[code].name}`);
  }, [userState, showToast]);

  const handleToggleDarkMode = useCallback(() => {
    userState.darkMode = !userState.darkMode;
    StorageService.save(userState);
    setUserState({ ...userState });
  }, [userState]);

  const handleToggleSound = useCallback(() => {
    userState.soundEnabled = !userState.soundEnabled;
    StorageService.save(userState);
    setUserState({ ...userState });
  }, [userState]);

  const handleUpdateImmersion = useCallback((val: number) => {
    const langProg = StorageService.ensureLangProgress(userState, userState.currentLang);
    langProg.immersion = val;
    // Same control as the reader's: a hand-set depth outranks the engine, and a
    // new depth starts a new consolidation run.
    noteManualImmersion();
    langProg.depthLessons = 0;
    StorageService.save(userState);
    StorageService.checkAndUnlockAchievements(userState, showToast);
    setUserState({ ...userState });
  }, [userState, showToast]);

  const handleLearnWord = useCallback((wordId: string) => {
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
      const updatedProg = {
        ...langProg,
        learnedWords: [...langProg.learnedWords, canonicalWordId],
      };
      const updatedState: UserState = {
        ...userState,
        xp: userState.xp + 2,
        languages: { ...userState.languages, [lang]: updatedProg },
      };
      StorageService.save(updatedState);
      StorageService.checkAndUnlockAchievements(updatedState, showToast);
      setUserState(updatedState);
      showToast('Слово добавлено в словарь! (+2 XP)');
    }
  }, [userState, showToast]);

  const handleForgetWord = useCallback((wordId: string) => {
    const lang = userState.currentLang;
    const langProg = StorageService.ensureLangProgress(userState, lang);
    // Drop the scheduling record too, otherwise forgotten words leave orphan
    // SRS entries behind forever and keep growing the persisted state.
    const { [wordId]: _droppedSrs, ...remainingSrs } = langProg.srsData;
    const updatedProg = {
      ...langProg,
      learnedWords: langProg.learnedWords.filter((id) => id !== wordId),
      srsData: remainingSrs,
    };
    const updatedState: UserState = {
      ...userState,
      languages: { ...userState.languages, [lang]: updatedProg },
    };
    StorageService.save(updatedState);
    setUserState(updatedState);
    setPopupWord(null);
    showToast('Слово удалено из словаря');
  }, [userState, showToast]);

  const handleSaveCustomLesson = useCallback((customLesson: Lesson) => {
    setActiveLessonId(customLesson.id);
    setCurrentRoute('reader');
    setUserState({ ...userState });
    showToast(`Свой урок «${customLesson.title}» создан! 🎉`);
  }, [userState, showToast]);

  const handleResetProgress = useCallback(() => {
    if (window.confirm('Точно сбросить весь прогресс? Это действие необратимо.')) {
      StorageService.reset();
      window.location.reload();
    }
  }, []);

  const handleOpenWordPopup = useCallback((word: Word, rect: DOMRect) => {
    // WordCardModal clamps the card against the viewport once it has measured
    // itself, so only the anchor point needs a sane initial guess here.
    const x = Math.min(Math.max(12, rect.left + rect.width / 2 - 140), window.innerWidth - 292);
    let y = rect.bottom + 10;
    if (y + 230 > window.innerHeight) {
      y = Math.max(10, rect.top - 240);
    }
    setPopupWord({ word, position: { left: x, top: y } });
  }, []);

  const handleClosePopup = useCallback(() => setPopupWord(null), []);
  const handleOpenNav = useCallback(() => setIsNavOpen(true), []);
  const handleCloseNav = useCallback(() => setIsNavOpen(false), []);
  const handleOpenAuth = useCallback(() => setShowAuthModal(true), []);
  const handleCloseAuth = useCallback(() => setShowAuthModal(false), []);
  const handleNavigateCustom = useCallback(() => handleNavigate('custom'), [handleNavigate]);
  const handleOpenRetake = useCallback(() => {
    setIsRetakeOnly(true);
    setShowOnboarding(true);
  }, []);

  // Find active lesson object
  const allLessons = useMemo(
    () => [...LESSONS, ...userState.customLessons],
    [userState.customLessons]
  );
  const activeLesson = useMemo(
    () => allLessons.find((l) => l.id === activeLessonId) || LESSONS[0],
    [allLessons, activeLessonId]
  );
  const isPopupWordLearned = useMemo(
    () => (popupWord
      ? StorageService.getLangProgress(userState, userState.currentLang).learnedWords.includes(popupWord.word.id)
      : false),
    [popupWord, userState]
  );

  return (
    <div onClick={handleClosePopup}>
      <div id="bgletters" aria-hidden="true">
        {backgroundLetters.map((item, index) => (
          <span
            key={index}
            style={{
              left: `${item.left}%`,
              top: `${item.top}%`,
              fontSize: `${item.fontSize}px`,
              animationDuration: `${item.duration}s`,
              animationDelay: `-${item.delay}s`,
            }}
          >
            {item.letter}
          </span>
        ))}
      </div>

      {/* Header */}
      <Header
        userState={userState}
        onNavigate={handleNavigate}
        onSelectLang={handleSelectLang}
        onToggleDarkMode={handleToggleDarkMode}
        onToggleSound={handleToggleSound}
        onOpenNav={handleOpenNav}
        onOpenAuth={handleOpenAuth}
      />

      {/* Layout Shell */}
      <div className="shell">
        {/* Drawer: a permanent column on wide screens, an overlay on a phone. */}
        <Sidebar
          currentRoute={currentRoute}
          userState={userState}
          isOpen={isNavOpen}
          onNavigate={handleNavigate}
          onClose={handleCloseNav}
          onUpdateImmersion={handleUpdateImmersion}
        />

        {/* Main Content Router */}
        <main>
          <ErrorBoundary resetKey={currentRoute}>
            <React.Suspense fallback={<RouteFallback />}>
              {currentRoute === 'lessons' && (
                <LessonList
                  userState={userState}
                  lessons={LESSONS}
                  onOpenLesson={handleOpenLesson}
                  onNavigateCustom={handleNavigateCustom}
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
                  onOpenWordPopup={handleOpenWordPopup}
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
                  onRetakeTest={handleOpenRetake}
                  onResetProgress={handleResetProgress}
                  onOpenAuth={handleOpenAuth}
                  onSignOut={handleSignOut}
                />
              )}
            </React.Suspense>
          </ErrorBoundary>
        </main>
      </div>

      {/* Floating Word Card Popup */}
      {popupWord && (
        <WordCardModal
          word={popupWord.word}
          position={popupWord.position}
          isLearned={isPopupWordLearned}
          currentLang={userState.currentLang}
          onLearn={handleLearnWord}
          onForget={handleForgetWord}
          onClose={handleClosePopup}
        />
      )}

      {/* Onboarding Modal */}
      {showOnboarding && (
        <ErrorBoundary resetKey={`onboarding-${currentRoute}`}>
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
        </ErrorBoundary>
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          localWordCount={Object.values(userState.languages).reduce(
            (total, progress) => total + (progress?.learnedWords.length ?? 0),
            0
          )}
          onClose={handleCloseAuth}
          onStartSignIn={handleCloseAuth}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && <div className="toast" role="status" aria-live="polite">{toastMessage}</div>}
    </div>
  );
};
