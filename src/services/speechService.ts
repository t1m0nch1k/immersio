import { LanguageCode } from '../types';

export interface PronunciationResult {
  score: number; // 0 to 100
  recognizedText: string;
  words: Array<{ word: string; matched: boolean }>;
}

export const SPEECH_LANG_MAP: Record<LanguageCode, string> = {
  en: 'en-US',
  es: 'es-ES',
  de: 'de-DE',
  fr: 'fr-FR',
  it: 'it-IT',
  ja: 'ja-JP',
  sk: 'sk-SK',
  cs: 'cs-CZ',
};

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
  );
}

export function cleanSpeechText(text: string): string {
  return text
    .normalize('NFC')
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'«»—–]/g, '')
    .trim();
}

export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const matrix: number[][] = [];
  for (let i = 0; i <= m; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= n; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[m][n];
}

export function evaluatePronunciation(
  spoken: string,
  expected: string,
  _lang: LanguageCode
): PronunciationResult {
  const cleanSpoken = cleanSpeechText(spoken);
  const cleanExpected = cleanSpeechText(expected);

  if (!cleanExpected) {
    return { score: 100, recognizedText: spoken, words: [] };
  }

  const expectedWords = cleanExpected.split(/\s+/).filter(Boolean);
  const spokenWords = cleanSpoken.split(/\s+/).filter(Boolean);

  if (expectedWords.length === 0) {
    return { score: 100, recognizedText: spoken, words: [] };
  }

  let matchedCount = 0;
  const matchedSpokenIndices = new Set<number>();

  const words = expectedWords.map((expWord) => {
    // Look for exact or close match in spoken words
    let matched = false;
    for (let i = 0; i < spokenWords.length; i++) {
      if (matchedSpokenIndices.has(i)) continue;
      const spk = spokenWords[i];
      const dist = levenshteinDistance(expWord, spk);
      const threshold = expWord.length <= 3 ? 0 : expWord.length <= 6 ? 1 : 2;
      if (dist <= threshold) {
        matched = true;
        matchedSpokenIndices.add(i);
        break;
      }
    }
    if (matched) matchedCount += 1;
    return { word: expWord, matched };
  });

  const score = Math.round((matchedCount / expectedWords.length) * 100);

  return {
    score,
    recognizedText: spoken,
    words,
  };
}

export interface SpeechListenOptions {
  lang: LanguageCode;
  onResult: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}

export function startSpeechRecognition(options: SpeechListenOptions): () => void {
  if (typeof window === 'undefined') return () => {};

  const SpeechRecognitionCtor =
    (window as unknown as { SpeechRecognition?: any }).SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition;

  if (!SpeechRecognitionCtor) {
    options.onError?.('Распознавание речи не поддерживается в этом браузере.');
    return () => {};
  }

  try {
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = SPEECH_LANG_MAP[options.lang] || 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      const activeText = finalTranscript || interimTranscript;
      options.onResult(activeText, Boolean(finalTranscript));
    };

    recognition.onerror = (event: any) => {
      options.onError?.(event.error || 'Ошибка распознавания речи');
    };

    recognition.onend = () => {
      options.onEnd?.();
    };

    recognition.start();

    return () => {
      try {
        recognition.stop();
      } catch {
        // Recognition already stopped
      }
    };
  } catch (err) {
    options.onError?.(err instanceof Error ? err.message : 'Не удалось запустить микрофон');
    return () => {};
  }
}
