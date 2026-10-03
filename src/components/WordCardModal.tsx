import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { LanguageCode, Word } from '../types';
import { LANGUAGES } from '../data/languages';
import { CATEGORIES } from '../data/categories';
import { audioService } from '../services/audioService';
import { evaluatePronunciation, isSpeechRecognitionSupported, startSpeechRecognition } from '../services/speechService';
import { Icon } from './icons';

interface WordCardModalProps {
  word: Word;
  position: { left: number; top: number };
  contextSentence?: string;
  isLearned: boolean;
  currentLang: LanguageCode;
  onLearn: (wordId: string) => void;
  onForget: (wordId: string) => void;
  onClose: () => void;
}

/** Gap kept between the card and the viewport edges, in CSS pixels. */
const VIEWPORT_MARGIN = 12;

/**
 * Fallback size used before the card has been measured. `.wcard` is 280px wide
 * in CSS; the height is content driven, so it is only an estimate for the first
 * frame and gets corrected by the measuring effect below.
 */
const FALLBACK_WIDTH = 280;
const FALLBACK_HEIGHT = 230;

/**
 * Clamps an absolute viewport coordinate so the box of `size` stays fully
 * visible. `maxLeft`/`maxTop` collapse to the margin when the box is wider or
 * taller than the viewport, which keeps the card pinned to the top-left corner
 * instead of flipping to a negative offset.
 */
export const clampToViewport = (
  desired: number,
  size: number,
  viewportSize: number
): number => {
  const max = viewportSize - size - VIEWPORT_MARGIN;
  if (max <= VIEWPORT_MARGIN) return VIEWPORT_MARGIN;
  return Math.min(Math.max(VIEWPORT_MARGIN, desired), max);
};

export const WordCardModal: React.FC<WordCardModalProps> = ({
  word,
  position,
  contextSentence,
  isLearned,
  currentLang,
  onLearn,
  onForget,
  onClose
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const [placement, setPlacement] = useState({ left: position.left, top: position.top });
  const [isListening, setIsListening] = useState(false);
  const [speechResult, setSpeechResult] = useState<{ score: number; recognized: string } | null>(null);
  const recognitionStopRef = useRef<(() => void) | null>(null);

  const langObj = LANGUAGES[currentLang] || LANGUAGES.en;
  const targetWord = word[currentLang] || word.en;
  const catObj = CATEGORIES[word.cat] || { emoji: '📌', title: word.cat };

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => () => {
    recognitionStopRef.current?.();
  }, []);

  /**
   * The card is `position: fixed` and is positioned from a rect measured in the
   * reader, so it can land off-screen on a narrow window, after a scroll, or
   * after a resize. Re-clamp on every one of those events, and re-measure when
   * the content changes height (the example sentence wraps differently per
   * language).
   */
  useLayoutEffect(() => {
    const node = cardRef.current;
    if (!node) return;

    const place = () => {
      const rect = node.getBoundingClientRect();
      const width = rect.width || FALLBACK_WIDTH;
      const height = rect.height || FALLBACK_HEIGHT;
      const left = clampToViewport(position.left, width, window.innerWidth);
      const top = clampToViewport(position.top, height, window.innerHeight);
      // Bail out when nothing moved: `getBoundingClientRect` runs on every
      // scroll tick, and returning the same object keeps React from re-rendering.
      setPlacement((prev) => (prev.left === left && prev.top === top ? prev : { left, top }));
    };

    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(place);
    observer?.observe(node);

    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      observer?.disconnect();
    };
  }, [position.left, position.top, word.id, isLearned, currentLang, contextSentence, speechResult, isListening]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      onCloseRef.current();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Dialogs must move focus into themselves so keyboard users are not left on
  // the word they clicked behind the popup.
  useEffect(() => {
    const firstInteractive = cardRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    firstInteractive?.focus();
  }, []);

  const handleSpeak = () => {
    audioService.speak(targetWord, currentLang);
  };

  const handleStartSpeaking = () => {
    if (isListening) {
      recognitionStopRef.current?.();
      setIsListening(false);
      return;
    }
    setSpeechResult(null);
    setIsListening(true);
    const stop = startSpeechRecognition({
      lang: currentLang,
      onResult: (text, isFinal) => {
        if (isFinal) {
          const evalRes = evaluatePronunciation(text, targetWord, currentLang);
          setSpeechResult({ score: evalRes.score, recognized: text });
          setIsListening(false);
          if (evalRes.score >= 70) {
            audioService.playSuccess();
          } else {
            audioService.playError();
          }
        }
      },
      onError: () => {
        setIsListening(false);
      },
      onEnd: () => {
        setIsListening(false);
      }
    });
    recognitionStopRef.current = stop;
  };

  return (
    <div
      ref={cardRef}
      className="wcard"
      role="dialog"
      aria-modal="true"
      aria-label={`Карточка слова ${targetWord}`}
      style={{
        left: `${placement.left}px`,
        top: `${placement.top}px`,
        maxWidth: `calc(100vw - ${VIEWPORT_MARGIN * 2}px)`
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="pflag">
        {langObj.flag} {langObj.name}
      </div>

      <div className="pfw">
        <span>{targetWord}</span>
        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
          <button
            type="button"
            className="iconbtn"
            onClick={handleSpeak}
            title="Озвучить"
            aria-label={`Озвучить слово ${targetWord}`}
            style={{ width: '32px', height: '32px' }}
          >
            <Icon name="volume" className="sm" />
          </button>
          {isSpeechRecognitionSupported() && (
            <button
              type="button"
              className="iconbtn"
              onClick={handleStartSpeaking}
              title={isListening ? 'Слушаю…' : 'Произнеси слово вслух'}
              aria-label={`Проверить произношение слова ${targetWord}`}
              style={{
                width: '32px',
                height: '32px',
                fontSize: '15px',
                background: isListening ? 'rgba(235, 87, 87, 0.15)' : undefined,
                color: isListening ? 'var(--coral)' : undefined
              }}
            >
              🎙️
            </button>
          )}
        </div>
      </div>

      {isListening && (
        <div style={{ fontSize: '11px', color: 'var(--coral)', margin: '2px 0 6px' }}>
          ● Говори слово в микрофон…
        </div>
      )}

      {speechResult && (
        <div style={{
          fontSize: '11.5px',
          padding: '4px 8px',
          borderRadius: '6px',
          margin: '4px 0 8px',
          background: speechResult.score >= 70 ? 'rgba(14, 138, 109, 0.15)' : 'rgba(235, 87, 87, 0.15)',
          color: speechResult.score >= 70 ? 'var(--sea)' : 'var(--coral)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{speechResult.score >= 70 ? '✓' : '✗'} «{speechResult.recognized}»</span>
          <b>{speechResult.score}%</b>
        </div>
      )}

      <div className="pru">{word.ru}</div>

      <div style={{ margin: '8px 0' }}>
        <span className="chip dim">
          {catObj.emoji} {catObj.title}
        </span>
      </div>

      {contextSentence && (
        <div style={{
          background: 'var(--paper2)',
          borderRadius: '8px',
          padding: '7px 9px',
          margin: '6px 0 8px',
          fontSize: '12px',
          lineHeight: '1.4',
          borderLeft: '3px solid var(--sun)'
        }}>
          <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink2)', marginBottom: '2px' }}>
            В контексте урока
          </div>
          <div>«{contextSentence}»</div>
        </div>
      )}

      {word.exampleRu && !contextSentence && (
        <div style={{ fontSize: '12.5px', color: 'var(--ink2)', margin: '8px 0', fontStyle: 'italic' }}>
          «{word.exampleRu}»
        </div>
      )}

      <div className="pbtns">
        {isLearned ? (
          <>
            <button
              type="button"
              className="btn small"
              onClick={() => {
                audioService.playClick();
                onForget(word.id);
              }}
            >
              Забыть
            </button>
            <button
              type="button"
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
            type="button"
            className="btn small sun"
            style={{ width: '100%' }}
            onClick={() => {
              audioService.playSuccess();
              onLearn(word.id);
            }}
          >
            <Icon name="check" /> Выучить (+2 XP)
          </button>
        )}
      </div>
    </div>
  );
};
