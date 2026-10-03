export interface ImmersionProfile {
  title: string;
  description: string;
  targetShare: number;
}

/**
 * Device-scoped flag: has the learner set the dial themselves?
 *
 * The dial auto-advances on its own, but a value a person chose by hand is a
 * deliberate decision and outranks the engine. Device-scoped rather than part of
 * the profile because it is a preference about *this* screen, not about the
 * person's progress.
 */
const MANUAL_KEY = 'pogruzhenie_immersion_manual_v1';

export const IMMERSION_PRESETS = [
  { value: 20, label: '20% · Опора' },
  { value: 40, label: '40% · Мостик' },
  { value: 60, label: '60% · Поток' },
  { value: 80, label: '80% · Среда' },
  { value: 95, label: '95% · Почти всё' },
  { value: 100, label: '100% · Полное' },
];

/**
 * Passed lessons to hold a depth for before it moves on its own.
 *
 * The first version of the engine advanced after every single lesson, and that
 * reached full immersion by the fifteenth: each step barely got tried. Holding a
 * depth for a run of lessons is what turns the dial into something the learner
 * actually consolidates at, rather than a number that races ahead of them.
 */
export const IMMERSION_LESSONS_PER_STEP = 3;

/** A pass this good means the depth has been earned, not just survived. */
const STRONG_PCT = 90;

export interface DepthDecision {
  immersion: number;
  /** Lessons now held at `immersion`. */
  lessonsAtDepth: number;
  /** Reset whenever the depth changes, so the next run starts from zero. */
  moved: 'up' | 'down' | null;
}

const belowPreset = (current: number): number | null => {
  const below = IMMERSION_PRESETS.filter((preset) => preset.value < current);
  return below.length > 0 ? below[below.length - 1].value : null;
};

const abovePreset = (current: number): number | null => {
  const above = IMMERSION_PRESETS.find((preset) => preset.value > current);
  return above ? above.value : null;
};

/**
 * What one finished lesson does to the immersion dial.
 *
 * Up only happens once the learner has held the current depth for a full run of
 * lessons *and* finished the last one strongly — two independent conditions,
 * because either alone is misleading. A high score on one lesson says they coped
 * with one text; a run of lessons says they cope with the depth.
 *
 * Down is immediate. A lesson they failed is evidence the depth is wrong right
 * now, and making them wait three more to be told so would be worse than moving
 * early.
 */
export const decideDepth = (
  current: number,
  lessonsAtDepth: number,
  result: { pct: number; passed: boolean },
  lessonsPerStep: number = IMMERSION_LESSONS_PER_STEP,
): DepthDecision => {
  const step = Math.max(1, lessonsPerStep);

  if (!result.passed) {
    const lower = belowPreset(current);
    return {
      immersion: lower ?? current,
      lessonsAtDepth: 0,
      moved: lower === null ? null : 'down',
    };
  }

  const held = lessonsAtDepth + 1;
  if (held < step) {
    return { immersion: current, lessonsAtDepth: held, moved: null };
  }

  // The run is complete. Only a strong finish on the last lesson earns the step.
  if (result.pct >= STRONG_PCT) {
    const higher = abovePreset(current);
    if (higher !== null) {
      return { immersion: higher, lessonsAtDepth: 0, moved: 'up' };
    }
  }

  // Held for a full run without earning a step: stay put and start a new run.
  return { immersion: current, lessonsAtDepth: 0, moved: null };
};

/**
 * Whether the learner ever moved the dial themselves.
 *
 * Recorded on the reader and in the sidebar; checked before the engine runs.
 */
export const noteManualImmersion = (): void => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(MANUAL_KEY, '1');
  } catch {
    // Storage unavailable or full. The engine simply keeps running.
  }
};

export const isImmersionManual = (): boolean => {
  if (typeof localStorage === 'undefined') return false;
  try {
    return localStorage.getItem(MANUAL_KEY) === '1';
  } catch {
    return false;
  }
};

/** Clears the manual flag, so the engine resumes. Nothing calls it yet. */
export const clearManualImmersion = (): void => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(MANUAL_KEY);
  } catch {
    // Nothing to do: the flag will simply stay as it was.
  }
};

export const getImmersionProfile = (value: number): ImmersionProfile => {
  if (value <= 20) {
    return {
      title: 'Опора',
      description: 'Короткие знакомые островки языка внутри понятного русского текста.',
      targetShare: 20,
    };
  }
  if (value <= 40) {
    return {
      title: 'Мостик',
      description: 'Ключевые существительные и действия постепенно переходят на новый язык.',
      targetShare: 40,
    };
  }
  if (value <= 60) {
    return {
      title: 'Поток',
      description: 'Половина ключевого словаря урока звучит на изучаемом языке.',
      targetShare: 60,
    };
  }
  if (value <= 80) {
    return {
      title: 'Среда',
      description: 'Изучаемый язык становится главным, а русский остаётся опорой.',
      targetShare: 80,
    };
  }
  if (value <= 95) {
    return {
      title: 'Почти без перевода',
      description: 'Почти весь текст на изучаемом языке, русский остаётся лишь в редких связках.',
      targetShare: 95,
    };
  }
  return {
    title: 'Полное погружение',
    description: 'Все 100% ключевых слов урока читаются на изучаемом языке.',
    targetShare: 100,
  };
};
