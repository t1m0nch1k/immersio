import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LanguageCode, ListeningItem, UserState } from '../types';
import { LANGUAGES } from '../data/languages';
import { audioService } from '../services/audioService';
import {
  DAILY_LISTENING_MINUTES,
  getListeningProgress,
  getRecommendedListeningItem,
  LISTENING_LIBRARY,
  recordListeningMinutes,
} from '../services/listeningService';
import { StorageService } from '../services/storageService';
import { toastService } from '../services/toastService';
import { LEVEL_LABELS } from '../utils';
import { Route } from '../routes';

interface ListeningViewProps {
  userState: UserState;
  onUpdateState: (newState: UserState) => void;
  onNavigate: (route: Route) => void;
}

type ListeningFilter = 'all' | 'audio' | 'video' | 'series' | 'audiobook';

const typeLabels: Record<ListeningFilter, string> = {
  all: 'Все',
  audio: 'Аудио',
  video: 'Видео',
  series: 'Сериалы',
  audiobook: 'Аудиокниги',
};

const levelLabel = (level: ListeningItem['level']): string => LEVEL_LABELS[level - 1] ?? String(level);

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
};

export const ListeningView: React.FC<ListeningViewProps> = ({ userState, onUpdateState, onNavigate }) => {
  const currentLang: LanguageCode = userState.currentLang;
  const language = LANGUAGES[currentLang] || LANGUAGES.en;
  const items = LISTENING_LIBRARY[currentLang] || LISTENING_LIBRARY.en;
  const progress = getListeningProgress(userState, currentLang);
  const recommended = getRecommendedListeningItem(currentLang);

  const [selectedId, setSelectedId] = useState(recommended.id);
  const [filter, setFilter] = useState<ListeningFilter>('all');
  const [isRunning, setIsRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(
    Math.max(60, (DAILY_LISTENING_MINUTES - progress.minutes) * 60)
  );

  useEffect(() => {
    setSelectedId(recommended.id);
    setFilter('all');
    setIsRunning(false);
    setSecondsLeft(Math.max(60, (DAILY_LISTENING_MINUTES - progress.minutes) * 60));
  }, [currentLang, recommended.id]);

  const selectedItem = items.find((item) => item.id === selectedId) || recommended;
  const filteredItems = useMemo(
    () => filter === 'all' ? items : items.filter((item) => item.type === filter),
    [filter, items]
  );

  const progressPercent = Math.min(100, Math.round((progress.minutes / DAILY_LISTENING_MINUTES) * 100));

  const refreshState = () => {
    StorageService.checkAndUnlockAchievements(userState, toastService.show);
    onUpdateState({ ...userState });
  };

  const recordMinutes = (minutes: number) => {
    const changed = recordListeningMinutes(userState, currentLang, selectedItem.id, minutes);
    if (!changed) return;
    audioService.playSuccess();
    // `recordListeningMinutes` already mutated `userState` in place and saved it;
    // the copy handed to `onUpdateState` is what publishes the new XP and minutes.
    refreshState();
  };

  // The timer ticks a plain number and the reward is triggered from an effect,
  // so StrictMode invoking the updater twice cannot credit the minutes twice.
  // `recordMinutes` is read through a ref that is refreshed on every commit:
  // switching material mid-session neither restarts the countdown (the timer
  // effect no longer depends on the item) nor leaves the reward crediting the
  // previously selected item, which the old dependency list did.
  const recordMinutesRef = useRef(recordMinutes);
  useEffect(() => {
    recordMinutesRef.current = recordMinutes;
  }, [recordMinutes]);

  /** Set once a countdown has been credited; blocks a second credit. */
  const sessionRewardedRef = useRef(false);

  useEffect(() => {
    if (!isRunning) return undefined;
    const timer = window.setInterval(() => {
      setSecondsLeft((value) => (value <= 1 ? 0 : value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isRunning]);

  // Terminal value reached: credit the planned minutes exactly once.
  useEffect(() => {
    if (!isRunning || secondsLeft > 0 || sessionRewardedRef.current) return;
    sessionRewardedRef.current = true;
    setIsRunning(false);
    recordMinutesRef.current(DAILY_LISTENING_MINUTES);
  }, [isRunning, secondsLeft]);

  const startSession = () => {
    if (progress.completed) return;
    audioService.playClick();
    window.open(selectedItem.url, '_blank', 'noopener,noreferrer');
    setSecondsLeft(Math.max(60, (DAILY_LISTENING_MINUTES - progress.minutes) * 60));
    sessionRewardedRef.current = false;
    setIsRunning(true);
  };

  const finishSession = () => {
    const plannedSeconds = Math.max(60, (DAILY_LISTENING_MINUTES - progress.minutes) * 60);
    const listenedMinutes = Math.max(1, Math.ceil((plannedSeconds - secondsLeft) / 60));
    setIsRunning(false);
    // A manually stopped session is a separate credit, so it resets the guard.
    sessionRewardedRef.current = false;
    recordMinutes(listenedMinutes);
    setSecondsLeft(Math.max(60, (DAILY_LISTENING_MINUTES - Math.min(DAILY_LISTENING_MINUTES, progress.minutes + listenedMinutes)) * 60));
  };

  return (
    <div className="view listening-view">
      <div className="overline">новый режим · {language.flag} {language.name}</div>
      <h1 className="display">Слушание на сегодня</h1>
      <p className="sub">
        Каждый день выбирай короткий рассказ, подкаст или видео и слушай примерно 15 минут. Ссылка открывает оригинальный бесплатный источник.
      </p>

      <section className="card listening-hero" aria-labelledby="listening-progress-title">
        <div className="listening-hero-copy">
          <div className="overline">погружение через звук</div>
          <h2 id="listening-progress-title">{progress.completed ? 'Сегодня уже достаточно 🎧' : '15 минут живого языка'}</h2>
          <p>
            Послушай сначала без текста, затем включи транскрипцию и повтори 2–3 фразы вслух. Не нужно понимать каждое слово.
          </p>
        </div>
        <div className="listening-progress-ring" aria-label={`Прослушано ${progress.minutes} из ${DAILY_LISTENING_MINUTES} минут`}>
          <b>{progress.minutes}</b>
          <span>/ {DAILY_LISTENING_MINUTES} мин</span>
        </div>
        <div className="listening-progress-bar"><span style={{ width: `${progressPercent}%` }} /></div>
      </section>

      <section className="card listening-session" aria-labelledby="listening-session-title">
        <div className="listening-session-head">
          <div>
            <div className="overline">рекомендация дня</div>
            <h2 id="listening-session-title">{selectedItem.title}</h2>
            <p>{selectedItem.description}</p>
          </div>
          <span className="chip sun">{levelLabel(selectedItem.level)} · {selectedItem.minutes} мин</span>
        </div>
        <div className="listening-source">{selectedItem.source} · {typeLabels[selectedItem.type]}</div>
        <div className="listening-session-actions">
          <a className="btn sun" href={selectedItem.url} target="_blank" rel="noreferrer" onClick={() => audioService.playClick()}>
            Открыть материал ↗
          </a>
          {!progress.completed && !isRunning && (
            <button className="btn pine" onClick={startSession}>▶ Начать 15 минут</button>
          )}
          {isRunning && (
            <button className="btn coral" onClick={finishSession}>
              Остановить · записать {Math.max(1, Math.ceil(((DAILY_LISTENING_MINUTES - progress.minutes) * 60 - secondsLeft) / 60))} мин
            </button>
          )}
          {!progress.completed && !isRunning && (
            <button className="btn ghost" onClick={() => recordMinutes(5)}>Засчитать 5 минут</button>
          )}
        </div>
        {isRunning && (
          <div className="listening-timer" aria-live="polite">
            <span>Сессия идёт</span><b>{formatTime(secondsLeft)}</b>
          </div>
        )}
        {selectedItem.transcriptUrl && (
          <a className="listening-transcript" href={selectedItem.transcriptUrl} target="_blank" rel="noreferrer">
            Открыть транскрипцию / материалы ↗
          </a>
        )}
      </section>

      <div className="section-heading listening-library-heading">
        <div>
          <div className="overline">библиотека</div>
          <h2>Что послушать дальше</h2>
        </div>
        <div className="listening-filters" role="tablist" aria-label="Тип материала">
          {(Object.keys(typeLabels) as ListeningFilter[]).map((key) => (
            <button
              key={key}
              className={`catchip ${filter === key ? 'on' : ''}`}
              onClick={() => setFilter(key)}
              role="tab"
              aria-selected={filter === key}
            >
              {typeLabels[key]}
            </button>
          ))}
        </div>
      </div>

      <div className="listening-grid">
        {filteredItems.map((item) => {
          const isSelected = selectedItem.id === item.id;
          const isDone = progress.completedItems.includes(item.id);
          return (
            <article className={`card listening-card ${isSelected ? 'is-selected' : ''}`} key={item.id}>
              <div className="listening-card-top">
                <span className="listening-kind">{typeLabels[item.type]}</span>
                <span className="chip dim">{levelLabel(item.level)}</span>
              </div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <div className="listening-card-meta">{item.source} · около {item.minutes} мин</div>
              <div className="listening-card-actions">
                <button className="btn small ghost" onClick={() => setSelectedId(item.id)}>
                  {isSelected ? 'Выбрано ✓' : 'Выбрать'}
                </button>
                <a className="btn small pine" href={item.url} target="_blank" rel="noreferrer">
                  Слушать ↗
                </a>
                {isDone && <span className="listening-done">Сегодня ✓</span>}
              </div>
            </article>
          );
        })}
      </div>

      <section className="card listening-method">
        <div className="overline">ритуал на 15 минут</div>
        <div className="listening-method-steps">
          <div><b>01</b><span>5 мин без текста — пойми тему и настроение.</span></div>
          <div><b>02</b><span>5 мин с транскрипцией — отметь 3 полезные фразы.</span></div>
          <div><b>03</b><span>5 мин повторно — проговори фразы вслед за диктором.</span></div>
        </div>
        <button className="btn small" onClick={() => onNavigate('practice')}>Закрепить новые слова →</button>
      </section>
    </div>
  );
};
