import { SRSItem } from '../types';
import { getLocalDateKey } from './storageService';

export class SRSService {
  public static createDefaultItem(wordId: string): SRSItem {
    const today = getLocalDateKey();
    return {
      wordId,
      interval: 0,
      repetition: 0,
      efactor: 2.5,
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
    let { repetition, interval, efactor } = item;

    // Constrain quality between 0 and 5
    const q = Math.max(0, Math.min(5, quality));

    // Calculate EF factor adjustment
    efactor = efactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    if (efactor < 1.3) efactor = 1.3;

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

    const now = new Date();
    const todayStr = getLocalDateKey(now);

    // Calculate due date
    const dueDateObj = new Date(now);
    dueDateObj.setDate(dueDateObj.getDate() + interval);
    const dueDateStr = getLocalDateKey(dueDateObj);

    return {
      wordId: item.wordId,
      interval,
      repetition,
      efactor,
      dueDate: dueDateStr,
      lastReviewed: todayStr,
    };
  }

  public static isDue(item: SRSItem): boolean {
    const today = getLocalDateKey();
    return item.dueDate <= today;
  }
}
