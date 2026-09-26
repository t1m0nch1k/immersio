import React, { useEffect, useMemo, useState } from 'react';
import { UserState, WordCategory } from '../types';
import { WORD_MAP, WORDS } from '../data/words';
import { CATEGORIES } from '../data/categories';
import { LANGUAGES } from '../data/languages';
import { StorageService } from '../services/storageService';
import { audioService } from '../services/audioService';
import { Route } from '../routes';
import { Icon } from './icons';

interface DictViewProps {
  userState: UserState;
  showAllWords?: boolean;
  onNavigate: (route: Route) => void;
  onLearnWord: (wordId: string) => void;
  onForgetWord: (wordId: string) => void;
}

const PAGE_SIZE = 100;

interface SearchableWord {
  id: string;
  target: string;
  ru: string;
  cat: WordCategory;
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
  const currentLangObj = LANGUAGES[currentLang] || LANGUAGES.en;

  // `userState` is the dependency on purpose: `learnedWords` is mutated in place
  // by several screens (for example the word sprint), so the array reference can
  // stay identical while its content changes. Only a new state object — which is
  // what every `onUpdateState` produces — reliably signals a change.
  const learnedIds = useMemo(
    () => [...langProg.learnedWords].reverse(),
    [userState, currentLang]
  );

  const sourceIds = useMemo(
    () => (showAllWords ? WORDS.map((word) => word.id) : learnedIds),
    [showAllWords, learnedIds]
  );

  // Lower-cased haystack built once per source list. Without it every keystroke
  // allocated two fresh lower-cased strings for each of the 3.6k words.
  const searchableWords = useMemo<SearchableWord[]>(
    () =>
      sourceIds
        .map((id) => WORD_MAP[id])
        .filter((word): word is NonNullable<typeof word> => Boolean(word))
        .map((word) => ({
          id: word.id,
          target: (word[currentLang] || word.en).toLowerCase(),
          ru: word.ru.toLowerCase(),
          cat: word.cat,
        })),
    [sourceIds, currentLang]
  );

  const categoriesInDict = useMemo(
    () => Array.from(new Set(searchableWords.map((word) => word.cat))) as WordCategory[],
    [searchableWords]
  );

  const filteredWords = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return searchableWords
      .filter((word) => {
        if (selectedCat && word.cat !== selectedCat) return false;
        if (!query) return true;
        return word.target.includes(query) || word.ru.includes(query);
      })
      .map((word) => word.id);
  }, [searchableWords, selectedCat, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredWords.length / PAGE_SIZE));
  const page = Math.min(currentPage, totalPages);
  const visibleWords = useMemo(
    () => filteredWords.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredWords, page]
  );

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
          <Icon name="search" className="lead" />
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
                  aria-label={`Озвучить ${targetTxt}`}
                >
                  <Icon name="volume" />
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
                    aria-label={isLearned ? 'Убрать из личного словаря' : 'Добавить в личный словарь'}
                    aria-pressed={isLearned}
                  >
                    <Icon name={isLearned ? 'check-double' : 'plus'} />
                  </button>
                ) : (
                  <button
                    className="iconbtn"
                    onClick={() => {
                      audioService.playClick();
                      onForgetWord(id);
                    }}
                    title="Забыть слово"
                    aria-label="Забыть слово"
                  >
                    <Icon name="minus" />
                  </button>
                )}
              </div>
            );
          })
        ) : (
          <div className="emptybox">
            <Icon name="book-bookmark" className="big" />
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
