import React from 'react';
import { LanguageCode, Word } from '../types';
import { LANGUAGES } from '../data/languages';
import { CATEGORIES } from '../data/categories';
import { audioService } from '../services/audioService';

interface WordCardModalProps {
  word: Word;
  position: { left: number; top: number };
  isLearned: boolean;
  currentLang: LanguageCode;
  onLearn: (wordId: string) => void;
  onForget: (wordId: string) => void;
  onClose: () => void;
}

export const WordCardModal: React.FC<WordCardModalProps> = ({
  word,
  position,
  isLearned,
  currentLang,
  onLearn,
  onForget,
  onClose
}) => {
  const langObj = LANGUAGES[currentLang] || LANGUAGES.en;
  const targetWord = word[currentLang] || word.en;
  const catObj = CATEGORIES[word.cat] || { emoji: '📌', title: word.cat };

  const handleSpeak = () => {
    audioService.speak(targetWord, currentLang);
  };

  return (
    <div
      className="wcard"
      role="dialog"
      aria-label={`Карточка слова ${targetWord}`}
      style={{
        left: `${position.left}px`,
        top: `${position.top}px`
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="pflag">
        {langObj.flag} {langObj.name}
      </div>

      <div className="pfw">
        <span>{targetWord}</span>
        <button
          className="iconbtn"
          onClick={handleSpeak}
          title="Озвучить"
          style={{ width: '32px', height: '32px', fontSize: '14px' }}
        >
          🔊
        </button>
      </div>

      <div className="pru">{word.ru}</div>

      <div style={{ margin: '8px 0' }}>
        <span className="chip dim">
          {catObj.emoji} {catObj.title}
        </span>
      </div>

      {word.exampleRu && (
        <div style={{ fontSize: '12.5px', color: 'var(--ink2)', margin: '8px 0', fontStyle: 'italic' }}>
          «{word.exampleRu}»
        </div>
      )}

      <div className="pbtns">
        {isLearned ? (
          <>
            <button
              className="btn small"
              onClick={() => {
                audioService.playClick();
                onForget(word.id);
              }}
            >
              Забыть
            </button>
            <button
              className="btn small pine"
              onClick={() => {
                audioService.playClick();
                onClose();
              }}
            >
              Ок ✓
            </button>
          </>
        ) : (
          <button
            className="btn small sun"
            style={{ width: '100%' }}
            onClick={() => {
              audioService.playSuccess();
              onLearn(word.id);
            }}
          >
            ✓ Выучить (+2 XP)
          </button>
        )}
      </div>
    </div>
  );
};
