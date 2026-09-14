import React from 'react';
import { UserState } from '../types';
import { LANGUAGES } from '../data/languages';
import { ALPHABETS } from '../data/alphabet';
import { audioService } from '../services/audioService';

interface AlphabetViewProps {
  userState: UserState;
  onNavigate: (route: string) => void;
}

export const AlphabetView: React.FC<AlphabetViewProps> = ({ userState, onNavigate }) => {
  const currentLang = userState.currentLang;
  const language = LANGUAGES[currentLang] || LANGUAGES.en;
  const alphabet = ALPHABETS[currentLang] || ALPHABETS.en;
  let letterIndex = 0;

  return (
    <div className="view">
      <div className="overline">{language.flag} {language.name} · справочник</div>
      <h1 className="display">{alphabet.title}</h1>
      <p className="sub">{alphabet.note}</p>

      <div className="guide-actions">
        <button className="btn sun" onClick={() => onNavigate('grammar')}>🧠 Грамматика</button>
        <button className="btn" onClick={() => onNavigate('dict-all')}>📚 Открыть словарь всех слов</button>
      </div>

      {alphabet.groups.map((group) => (
        <section className="alphabet-section" key={group.title}>
          <div className="section-heading">
            <div>
              <div className="overline">{language.name}</div>
              <h2>{group.title}</h2>
            </div>
            {group.description && <p>{group.description}</p>}
          </div>
          <div className="alphabet-grid">
            {group.letters.map((letter) => {
              letterIndex += 1;
              const currentIndex = letterIndex;
              return (
                <button
                  className="card alphabet-letter"
                  key={`${group.title}-${letter}-${currentIndex}`}
                  onClick={() => audioService.speak(letter, currentLang)}
                  title={`Произнести ${letter}`}
                  aria-label={`Произнести букву ${letter}`}
                >
                  <span className="alphabet-index">{String(currentIndex).padStart(2, '0')}</span>
                  <strong>{letter}</strong>
                  <span className="alphabet-sound">🔊</span>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      <div className="card alphabet-footer">
        <span>💡</span>
        <p>Нажимай на любую букву, чтобы услышать её через Edge-TTS, а затем переходи к словам для закрепления.</p>
        <button className="btn small pine" onClick={() => onNavigate('dict-all')}>Слова по этой теме →</button>
      </div>
    </div>
  );
};
