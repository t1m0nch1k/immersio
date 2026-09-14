import React, { useEffect, useState } from 'react';
import { UserState, WordCategory } from '../types';
import { WORD_MAP, WORDS } from '../data/words';
import { CATEGORIES } from '../data/categories';
import { LANGUAGES } from '../data/languages';
import { StorageService } from '../services/storageService';
import { audioService } from '../services/audioService';

interface DictViewProps {
  userState: UserState;
  showAllWords?: boolean;
  onNavigate: (route: string) => void;
  onLearnWord: (wordId: string) => void;
  onForgetWord: (wordId: string) => void;
}

export const DictView: React.FC<DictViewProps> = ({
  userState,
  showAllWords = false,
  onNavigate,
  onLearnWord,
  onForgetWord,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState<WordCategory | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const currentLang = userState.currentLang;
  const langProg = StorageService.getLangProgress(userState, currentLang);
  const learnedIds = [...langProg.learnedWords].reverse();
  const sourceIds = showAllWords ? WORDS.map((word) => word.id) : learnedIds;
  const currentLangObj = LANGUAGES[currentLang] || LANGUAGES.en;
  const PAGE_SIZE = 100;

  const categoriesInDict = Array.from(
    new Set(sourceIds.map((id) => WORD_MAP[id]?.cat).filter(Boolean))
  ) as WordCategory[];

  const filteredWords = sourceIds.filter((id) => {
    const word = WORD_MAP[id];
    if (!word) return false;
    if (selectedCat && word.cat !== selectedCat) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const targetTxt = (word[currentLang] || word.en).toLowerCase();
      const ruTxt = word.ru.toLowerCase();
      if (!targetTxt.includes(q) && !ruTxt.includes(q)) return false;
    }
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filteredWords.length / PAGE_SIZE));
  const page = Math.min(currentPage, totalPages);
  const visibleWords = filteredWords.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCat, currentLang, showAllWords]);

  return (
    <div className="view">
      <div className="overline">
        {currentLangObj.flag} {currentLangObj.name}
      </div>
      <h1 className="display">{showAllWords ? 'Все слова' : 'Личный словарь'}</h1>
      <p className="sub">
        {showAllWords
          ? `Полный словарь: ${WORDS.length} слов с переводом на ${currentLangObj.name}. Добавляй их в личный словарь по мере изучения.`
          : 'Все выученные слова автоматически отображаются в читаемых текстах на изучаемом языке.'}
      </p>

      <div className="dict-switch" role="tablist" aria-label="Режим словаря">
        <button className={!showAllWords ? 'active' : ''} onClick={() => onNavigate('dict')}>Мои слова · {learnedIds.length}</button>
        <button className={showAllWords ? 'active' : ''} onClick={() => onNavigate('dict-all')}>Все слова · {WORDS.length}</button>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="dictbar">
        <div className="search">
          🔍{' '}
          <input
            placeholder="Поиск по слову или переводу..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

          <button
            className={`catchip ${selectedCat === null ? 'on' : ''}`}
            onClick={() => setSelectedCat(null)}
          >
          Все ({sourceIds.length})
        </button>

        {categoriesInDict.map((catKey) => {
          const cat = CATEGORIES[catKey];
          if (!cat) return null;
          return (
            <button
              key={catKey}
              className={`catchip ${selectedCat === catKey ? 'on' : ''}`}
              onClick={() => setSelectedCat(catKey)}
            >
              {cat.emoji} {cat.title}
            </button>
          );
        })}
      </div>

      {/* Word List Table */}
      <div className="card" style={{ padding: '8px 0' }}>
        {filteredWords.length > 0 ? (
          visibleWords.map((id, idx) => {
            const word = WORD_MAP[id];
            if (!word) return null;
            const targetTxt = word[currentLang] || word.en;
            const catObj = CATEGORIES[word.cat] || { emoji: '📌', title: word.cat };
            const isLearned = langProg.learnedWords.includes(id);

            return (
              <div key={id} className="wrow" style={{ animationDelay: `${Math.min(idx * 0.03, 0.4)}s` }}>
                <span className="fw">{targetTxt}</span>
                <span className="ru">{word.ru}</span>

                <span className="chip dim" style={{ marginRight: 'auto' }}>
                  {catObj.emoji} {catObj.title}
                </span>

                <button
                  className="iconbtn"
                  onClick={() => audioService.speak(targetTxt, currentLang)}
                  title="Озвучить"
                >
                  🔊
                </button>

                {showAllWords ? (
                  <button
                    className={`iconbtn ${isLearned ? 'learned-action' : ''}`}
                    onClick={() => {
                      audioService.playClick();
                      if (isLearned) onForgetWord(id);
                      else onLearnWord(id);
                    }}
                    title={isLearned ? 'Убрать из личного словаря' : 'Добавить в личный словарь'}
                  >
                    {isLearned ? '✓' : '+'}
                  </button>
                ) : (
                  <button
                    className="iconbtn"
                    onClick={() => {
                      audioService.playClick();
                      onForgetWord(id);
                    }}
                    title="Забыть слово"
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })
        ) : (
          <div className="emptybox">
            <span className="big">📖</span>
            {sourceIds.length > 0
              ? 'Ничего не найдено по вашему запросу.'
              : 'Словарь пока пуст. Читай уроки и нажимай на жёлтые слова, чтобы добавлять их!'}
          </div>
        )}
      </div>

      {filteredWords.length > 0 && totalPages > 1 && (
        <div className="pagination" aria-label="Страницы словаря">
          <button className="btn small" disabled={page === 1} onClick={() => setCurrentPage(page - 1)}>← Назад</button>
          <span>Страница {page} из {totalPages} · слова {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredWords.length)}</span>
          <button className="btn small" disabled={page === totalPages} onClick={() => setCurrentPage(page + 1)}>Вперёд →</button>
        </div>
      )}
    </div>
  );
};
