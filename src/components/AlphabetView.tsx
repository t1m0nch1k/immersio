import React, { useEffect, useMemo, useState } from 'react';
import { UserState } from '../types';
import { LANGUAGES } from '../data/languages';
import { ALPHABETS } from '../data/alphabet';
import { audioService } from '../services/audioService';
import { VirtualKeyboard } from './VirtualKeyboard';
import { Route } from '../routes';
import { Icon } from './icons';

interface AlphabetViewProps {
  userState: UserState;
  onNavigate: (route: Route) => void;
}

export const AlphabetView: React.FC<AlphabetViewProps> = ({ userState, onNavigate }) => {
  const currentLang = userState.currentLang;
  const language = LANGUAGES[currentLang] || LANGUAGES.en;
  const alphabet = ALPHABETS[currentLang] || ALPHABETS.en;
  const [keyboardText, setKeyboardText] = useState('');

  // Numbering runs across all groups, so it is computed once instead of being
  // incremented inside the render pass (a side effect during render).
  const indexedGroups = useMemo(() => {
    let index = 0;
    return alphabet.groups.map((group) => ({
      ...group,
      letters: group.letters.map((letter) => ({ letter, index: (index += 1) })),
    }));
  }, [alphabet]);

  useEffect(() => {
    setKeyboardText('');
  }, [currentLang]);

  return (
    <div className="view">
      <div className="overline">{language.flag} {language.name} · справочник</div>
      <h1 className="display">{alphabet.title}</h1>
      <p className="sub">{alphabet.note}</p>

      <div className="guide-actions">
        <button className="btn sun" onClick={() => onNavigate('grammar')}>
          <Icon name="brain" /> Грамматика
        </button>
        <button className="btn" onClick={() => onNavigate('dict-all')}>
          <Icon name="book-open" /> Открыть словарь всех слов
        </button>
      </div>

      <section className="card alphabet-keyboard-card">
        <div className="section-heading">
          <div>
            <div className="overline">попробуй сам</div>
            <h2>Набери слово на {language.name}</h2>
          </div>
          <p>Клавиатура помогает найти буквы с диакритикой и японскую хирагану. Этот ввод не меняет прогресс.</p>
        </div>
        <div className="alphabet-keyboard-input-row">
          <input
            className="alphabet-keyboard-input"
            lang={currentLang}
            value={keyboardText}
            onChange={(event) => setKeyboardText(event.target.value)}
            placeholder={currentLang === 'ja' ? 'Например: こんにちは' : 'Например: слово с новой буквой'}
            autoComplete="off"
            spellCheck={false}
            aria-label={`Пробное поле для ${language.name}`}
          />
          <button
            type="button"
            className="iconbtn"
            disabled={!keyboardText}
            onClick={() => audioService.speak(keyboardText, currentLang)}
            aria-label="Произнести набранный текст"
            title="Произнести набранный текст"
          >
            <Icon name="volume" />
          </button>
        </div>
        <VirtualKeyboard lang={currentLang} value={keyboardText} onChange={setKeyboardText} defaultOpen />
      </section>

      {indexedGroups.map((group) => (
        <section className="alphabet-section" key={group.title}>
          <div className="section-heading">
            <div>
              <div className="overline">{language.name}</div>
              <h2>{group.title}</h2>
            </div>
            {group.description && <p>{group.description}</p>}
          </div>
          <div className="alphabet-grid">
            {group.letters.map(({ letter, index: currentIndex }) => (
              <button
                className="card alphabet-letter"
                key={`${group.title}-${letter}-${currentIndex}`}
                onClick={() => audioService.speak(letter, currentLang)}
                title={`Произнести ${letter}`}
                aria-label={`Произнести букву ${letter}`}
              >
                <span className="alphabet-index">{String(currentIndex).padStart(2, '0')}</span>
                <strong>{letter}</strong>
                <span className="alphabet-sound"><Icon name="volume" className="sm" /></span>
              </button>
            ))}
          </div>
        </section>
      ))}

      <div className="card alphabet-footer">
        <span className="alphabet-tip-icon"><Icon name="lightbulb" size={24} /></span>
        <p>Нажимай на любую букву, чтобы услышать её через Edge-TTS, а затем переходи к словам для закрепления.</p>
        <button className="btn small pine" onClick={() => onNavigate('dict-all')}>Слова по этой теме →</button>
      </div>
    </div>
  );
};
