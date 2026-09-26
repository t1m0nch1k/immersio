import { SRSItem } from '../types';
import { getLocalDateKey } from './storageService';

const EFACTOR_DEFAULT = 2.5;
/** SuperMemo-2 never leaves the 1.3..3.0 band; the bounds are mirrored in `StorageService.load`. */
const EFACTOR_MIN = 1.3;
const EFACTOR_MAX = 3.0;
/** Keeps `dueDate` inside the representable `Date` range, so it stays `YYYY-MM-DD`. */
const MAX_INTERVAL_DAYS = 36500;

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isNonNegativeNumber = (value: unknown): value is number => isFiniteNumber(value) && value >= 0;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

/** A stored card can be anything after a bad write, so every field is re-checked here. */
const safeFields = (item: SRSItem): Pick<SRSItem, 'wordId' | 'interval' | 'repetition' | 'efactor'> => ({
  wordId: typeof item?.wordId === 'string' ? item.wordId : '',
  interval: isNonNegativeNumber(item?.interval) ? Math.min(item.interval, MAX_INTERVAL_DAYS) : 0,
  repetition: isNonNegativeNumber(item?.repetition) ? Math.floor(item.repetition) : 0,
  efactor: isFiniteNumber(item?.efactor) ? clamp(item.efactor, EFACTOR_MIN, EFACTOR_MAX) : EFACTOR_DEFAULT,
});

export class SRSService {
  public static createDefaultItem(wordId: string): SRSItem {
    const today = getLocalDateKey();
    return {
      wordId,
      interval: 0,
      repetition: 0,
      efactor: EFACTOR_DEFAULT,
      dueDate: today,
      lastReviewed: today,
    };
  }

  /**
   * SuperMemo-2 Spaced Repetition Algorithm
   * @param item Current SRS state of word
   * @param quality Review rating (0 to 5)
   *  5 - Perfect response
   *  4 - Correct response with slight hesitation
   *  3 - Correct response recalled with difficulty
   *  2 - Incorrect response, but easy to recall upon seeing answer
   *  1 - Incorrect response, familiar
   *  0 - Complete blackout
   */
  public static calculateNextReview(item: SRSItem, quality: number): SRSItem {
    const current = safeFields(item);
    let { repetition, interval, efactor } = current;

    // Constrain quality between 0 and 5. A missing rating counts as a blackout
    // so a corrupt value can never poison the interval with NaN.
    const q = clamp(isFiniteNumber(quality) ? quality : 0, 0, 5);

    // Calculate EF factor adjustment
    efactor = clamp(efactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)), EFACTOR_MIN, EFACTOR_MAX);

    if (q < 3) {
      // Failed recall: reset repetitions
      repetition = 0;
      interval = 1;
    } else {
      // Successful recall
      if (repetition === 0) {
        interval = 1;
      } else if (repetition === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * efactor);
      }
      repetition += 1;
    }
    interval = clamp(interval, 1, MAX_INTERVAL_DAYS);

    const now = new Date();
    const todayStr = getLocalDateKey(now);

    // Calculate due date
    const dueDateObj = new Date(now);
    dueDateObj.setDate(dueDateObj.getDate() + interval);
    const dueDateStr = getLocalDateKey(dueDateObj);

    return {
      wordId: current.wordId,
      interval,
      repetition,
      efactor,
      dueDate: dueDateStr,
      lastReviewed: todayStr,
    };
  }

  public static isDue(item: SRSItem): boolean {
    const today = getLocalDateKey();
    // An unreadable date must not hide a card forever: treat it as due.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(item?.dueDate ?? ''))) return true;
    return String(item.dueDate) <= today;
  }
}
