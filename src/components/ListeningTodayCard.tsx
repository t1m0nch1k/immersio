import React from 'react';
import { UserState } from '../types';
import { LANGUAGES } from '../data/languages';
import {
  DAILY_LISTENING_MINUTES,
  getListeningProgress,
  getRecommendedListeningItem,
} from '../services/listeningService';
import { Route } from '../routes';
import { Icon } from './icons';

interface ListeningTodayCardProps {
  userState: UserState;
  onNavigate: (route: Route) => void;
  compact?: boolean;
}

export const ListeningTodayCard: React.FC<ListeningTodayCardProps> = ({ userState, onNavigate, compact = false }) => {
  const lang = userState.currentLang;
  const language = LANGUAGES[lang] || LANGUAGES.en;
  const progress = getListeningProgress(userState, lang);
  const item = getRecommendedListeningItem(lang);
  const percent = Math.min(100, Math.round((progress.minutes / DAILY_LISTENING_MINUTES) * 100));

  return (
    <section className={`card listening-teaser ${compact ? 'listening-teaser-compact' : ''}`}>
      <div className="listening-teaser-icon"><Icon name="headphones" /></div>
      <div className="listening-teaser-body">
        <div className="overline">слушание · {language.name}</div>
        <h2>{progress.completed ? 'Слуховая практика выполнена' : '15 минут живого языка'}</h2>
        <p>{item.title} · {item.source}</p>
        <div className="listening-teaser-track"><span style={{ width: `${percent}%` }} /></div>
        <small>{progress.minutes} из {DAILY_LISTENING_MINUTES} минут сегодня</small>
      </div>
      <button className="btn sun" onClick={() => onNavigate('listening')}>
        {progress.completed ? 'Открыть библиотеку →' : 'Начать слушание →'}
      </button>
    </section>
  );
};
