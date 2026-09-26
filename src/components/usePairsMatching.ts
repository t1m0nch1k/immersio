import { useCallback, useState } from 'react';

export type PairSide = 'L' | 'R';

export interface PairSelection {
  side: PairSide;
  id: string;
}

/**
 * What a click did, so the caller can decide about sounds and rewards without
 * the hook knowing anything about XP, confetti or lesson progress.
 */
export type PairsClickResult =
  /** The pair is already matched; the click is a no-op. */
  | 'ignored'
  /** First card of a new attempt was picked. */
  | 'selected'
  /** The learner switched to another card on the same side. */
  | 'reselected'
  /** Two opposite cards share an id. */
  | 'matched'
  /** The last outstanding pair was matched. */
  | 'completed'
  /** Two opposite cards hold different ids. */
  | 'missed';

export interface PairsMatching {
  matched: string[];
  selection: PairSelection | null;
  errors: number;
  isDone: boolean;
  click: (side: PairSide, id: string) => PairsClickResult;
  reset: () => void;
}

/**
 * Shared "connect the pairs" state machine for the reader exercise and the
 * practice hub.
 *
 * Only the selection state lives here; every side effect (sounds, XP, confetti,
 * lesson scoring) stays in the caller because the two call sites award
 * different rewards. Keeping the state machine in one place stops the two
 * copies from drifting — the practice version had already lost the error
 * counting the reader version has.
 */
export const usePairsMatching = (total: number): PairsMatching => {
  const [matched, setMatched] = useState<string[]>([]);
  const [selection, setSelection] = useState<PairSelection | null>(null);
  const [errors, setErrors] = useState(0);

  const reset = useCallback(() => {
    setMatched([]);
    setSelection(null);
    setErrors(0);
  }, []);

  const click = useCallback(
    (side: PairSide, id: string): PairsClickResult => {
      if (matched.includes(id)) return 'ignored';

      if (!selection || selection.side === side) {
        setSelection({ side, id });
        return selection ? 'reselected' : 'selected';
      }

      if (selection.id === id) {
        const nextMatched = [...matched, id];
        setMatched(nextMatched);
        setSelection(null);
        return nextMatched.length >= total ? 'completed' : 'matched';
      }

      setErrors((previous) => previous + 1);
      setSelection(null);
      return 'missed';
    },
    [matched, selection, total]
  );

  return {
    matched,
    selection,
    errors,
    isDone: total > 0 && matched.length >= total,
    click,
    reset,
  };
};
