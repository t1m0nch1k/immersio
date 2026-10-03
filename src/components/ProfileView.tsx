import React, { useCallback, useMemo } from 'react';
import { LanguageCode, UserState } from '../types';
import { LANGUAGES } from '../data/languages';
import { ACHIEVEMENTS } from '../data/achievements';
import { LESSONS } from '../data/lessons';
import { StorageService, getLocalDateKey } from '../services/storageService';
import { audioService } from '../services/audioService';
import { AVATARS, LANGUAGE_CODES, LEVEL_LABELS } from '../utils';
import { WORDS_BY_LEVEL } from '../utils/words';
import { fileToAvatarDataUrl, isAvatarPhoto } from '../utils/avatar';
import { toastService } from '../services/toastService';
import { getAppVersionInfo, UpdateService } from '../services/updateService';
import { Icon } from './icons';
import { SyncPanel } from './SyncPanel';

interface ProfileViewProps {
  userState: UserState;
  onUpdateState: (newState: UserState) => void;
  onRetakeTest: () => void;
  onResetProgress: () => void;
  onOpenAuth: () => void;
  onSignOut: () => void;
  onCheckUpdates?: () => void;
}

const LEVELS = [1, 2, 3, 4] as const;

/** Words per level, resolved once instead of filtering the whole corpus per render. */
const LEVEL_TOTALS: readonly number[] = LEVELS.map((level) => WORDS_BY_LEVEL[level].length);

/**
 * `word.id -> index in LEVELS`, built once at module load. Lets mastery counting
 * walk the learned-word ids instead of the full 3666-word corpus.
 */
const WORD_LEVEL_INDEX: Readonly<Record<string, number>> = (() => {
  const index: Record<string, number> = {};
  LEVELS.forEach((level, position) => {
    for (const word of WORDS_BY_LEVEL[level]) index[word.id] = position;
  });
  return index;
})();

const HISTOGRAM_DAYS = 14;

/** Builds the `HISTOGRAM_DAYS` trailing day keys. Kept out of render. */
const buildHistoryStrip = (history: readonly string[]): { dateStr: string; isActive: boolean }[] => {
  const active = new Set(history);
  const today = new Date();
  const strip: { dateStr: string; isActive: boolean }[] = [];
  for (let offset = HISTOGRAM_DAYS - 1; offset >= 0; offset -= 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - offset);
    const dateStr = getLocalDateKey(day);
    strip.push({ dateStr, isActive: active.has(dateStr) });
  }
  return strip;
};

const ProfileHeader = React.memo<{
  userState: UserState;
  xpPct: number;
  currentRank: string;
  nextRank: string | null;
  nextXp: number;
  onNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}>(({ userState, xpPct, currentRank, nextRank, nextXp, onNameChange }) => {
  const langObj = LANGUAGES[userState.currentLang] || LANGUAGES.en;
  const langProg = StorageService.getLangProgress(userState, userState.currentLang);

  return (
    <>
      {/* Header Profile Card */}
      <div className="card phead" style={{ marginTop: '18px' }}>
        <div className="avatar" style={{ position: 'relative' }}>
          {isAvatarPhoto(userState.avatar) ? (
            <img src={userState.avatar} alt="Аватар" />
          ) : (
            userState.avatar
          )}
        </div>


        <div style={{ flex: 1, minWidth: '240px' }}>
          <div className="pname">
            <input
              maxLength={20}
              placeholder="Твоё имя"
              value={userState.name}
              onChange={onNameChange}
            />
            ✏️
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
            <span className="chip sun">
              {langObj.flag} {langObj.name}
            </span>
            {langProg.testLvl && <span className="chip sea">уровень: {langProg.testLvl}</span>}
            <span className="chip">
              ранг: <b>{currentRank}</b>
            </span>
            <span className="chip sea">Бесплатный доступ</span>
          </div>

          <div className="rankbar">
            <i style={{ width: `${xpPct}%` }}></i>
          </div>
          <div style={{ fontSize: '12.5px', color: 'var(--ink2)', marginTop: '4px' }}>
            {nextRank ? `${userState.xp} / ${nextXp} XP до ранга «${nextRank}»` : 'Максимальный ранг достигнут! 🎉'}
          </div>
        </div>
      </div>

      {/* 4 Stat Boxes */}
      <div className="stats">
        <div className="card stat fire">
          <b><Icon name="flame" /> {userState.streak.current}</b>
          <span>текущий стрик (дн.)</span>
        </div>
        <div className="card stat">
          <b><Icon name="medal" /> {userState.streak.best}</b>
          <span>макс. стрик (дн.)</span>
        </div>
        <div className="card stat sea">
          <b>{langProg.learnedWords.length}</b>
          <span>слов в словаре</span>
        </div>
        <div className="card stat">
          <b><Icon name="bolt" /> {userState.xp}</b>
          <span>опыта всего (XP)</span>
        </div>
      </div>
    </>
  );
});
ProfileHeader.displayName = 'ProfileHeader';

const MasteryGrid = React.memo<{ userState: UserState; today: string }>(({ userState, today }) => {
  const rows = useMemo(
    () => LANGUAGE_CODES.map((code) => {
      const language = LANGUAGES[code];
      const progress = StorageService.getLangProgress(userState, code);
      const learned = new Set(progress.learnedWords);
      // Count per level by walking the learned ids (usually hundreds) instead of
      // the whole corpus (thousands) for every language and every level.
      const knownPerLevel = LEVELS.map(() => 0);
      for (const wordId of learned) {
        const position = WORD_LEVEL_INDEX[wordId];
        if (position !== undefined) knownPerLevel[position] += 1;
      }
      return {
        code,
        flag: language.flag,
        name: language.name,
        learnedCount: learned.size,
        doneLessons: Object.keys(progress.doneLessons).length,
        minutesToday: progress.dailyActivity[today]?.minutes || 0,
        knownPerLevel,
      };
    }),
    [userState, today]
  );

  return (
    <div className="card mastery-section">
      <div className="section-heading">
        <div>
          <div className="overline">карта прогресса</div>
          <h2>Мастерство по языкам</h2>
        </div>
        <p>Сколько слов и уроков уже закреплено на каждом уровне.</p>
      </div>
      <div className="mastery-grid">
        {rows.map((row) => (
          <article className={`mastery-card ${row.code === userState.currentLang ? 'current' : ''}`} key={row.code}>
            <div className="mastery-head">
              <b>{row.flag} {row.name}</b>
              <span>{row.learnedCount} слов</span>
            </div>
            <div className="mastery-meta">{row.doneLessons}/{LESSONS.length} уроков · {row.minutesToday} мин сегодня</div>
            <div className="mastery-levels">
              {LEVELS.map((level, position) => {
                const total = LEVEL_TOTALS[position];
                const knownCount = row.knownPerLevel[position];
                const levelPct = total ? Math.round((knownCount / total) * 100) : 0;
                return (
                  <div className="mastery-level" key={level}>
                    <span>{LEVEL_LABELS[position]}</span>
                    <div className="mastery-bar"><i style={{ width: `${levelPct}%` }} /></div>
                    <small>{knownCount}/{total}</small>
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
});
MasteryGrid.displayName = 'MasteryGrid';

const HistoryHeatmap = React.memo<{ days: { dateStr: string; isActive: boolean }[] }>(({ days }) => (
  <div className="card" style={{ marginTop: '16px' }}>
    <h3 style={{ fontSize: '15px', marginBottom: '8px' }}>
      Активность за последние 14 дней
    </h3>
    <div className="hgrid">
      {days.map((item) => (
        <div
          key={item.dateStr}
          className={`hg ${item.isActive ? 'on' : ''}`}
          title={item.dateStr}
        ></div>
      ))}
    </div>
  </div>
));
HistoryHeatmap.displayName = 'HistoryHeatmap';

/**
 * Takes the whole state, not `userState.achievements`: achievements are pushed
 * onto the same array in place by `StorageService.checkAndUnlockAchievements`,
 * so passing the array would hand `memo` an unchanged prop after a new unlock
 * and the tile would stay locked until the next reload.
 */
const AchievementsGrid = React.memo<{ userState: UserState }>(({ userState }) => {
  const unlocked = userState.achievements;
  const unlockedSet = useMemo(() => new Set(unlocked), [userState]);

  return (
    <div className="card" style={{ marginTop: '16px' }}>
      <h3 style={{ fontSize: '15.5px', marginBottom: '12px' }}>
        Достижения и награды · {unlocked.length}/{ACHIEVEMENTS.length}
      </h3>
      <div className="agrid">
        {ACHIEVEMENTS.map((ach) => (
          <div key={ach.id} className={`ach ${unlockedSet.has(ach.id) ? '' : 'lock'}`}>
            <span className="ico">{ach.ico}</span>
            <b>{ach.name}</b>
            <span>{ach.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
});
AchievementsGrid.displayName = 'AchievementsGrid';

const SettingsPanel = React.memo<{
  userState: UserState;
  onSelectAvatar: (avatar: string) => void;
  onPickPhoto: (file: File | null, input: HTMLInputElement) => void;
  onClearPhoto: () => void;

  onSelectLang: (code: LanguageCode) => void;
  onRetakeTest: () => void;
  onResetProgress: () => void;
}>(({ userState, onSelectAvatar, onPickPhoto, onClearPhoto, onSelectLang, onRetakeTest, onResetProgress }) => (
  <div className="card" style={{ marginTop: '16px' }}>
    <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Настройки профиля</h3>

    <div className="overline" style={{ marginTop: '8px' }}>
      Аватар
    </div>
    <div className="avatar-upload">
      <label className="btn small">
        <Icon name="camera" /> Своё фото
        <input
          type="file"
          accept="image/*"
          className="visually-hidden"
          onChange={(event) => onPickPhoto(event.target.files?.[0] ?? null, event.target)}
        />
      </label>
      {isAvatarPhoto(userState.avatar) && (
        <button type="button" className="btn small" onClick={onClearPhoto}>
          Убрать фото
        </button>
      )}
      <small className="dim">
        Фото обрезается в круг и хранится только на этом устройстве. Снимите его при дневном свете.
      </small>
    </div>
    <div className="avgrid">
      {AVATARS.map((av) => (
        <button
          key={av}
          type="button"
          className={`av ${av === userState.avatar ? 'cur' : ''}`}
          onClick={() => onSelectAvatar(av)}
          aria-label={`Аватар ${av}`}
        >
          {av}
        </button>
      ))}
    </div>


    <div className="overline" style={{ marginTop: '16px' }}>
      Изучаемый язык
    </div>
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
      {LANGUAGE_CODES.map((code) => {
        const lang = LANGUAGES[code];
        return (
          <button
            key={code}
            type="button"
            className={`btn small ${code === userState.currentLang ? 'sun' : ''}`}
            onClick={() => onSelectLang(code)}
          >
            {lang.flag} {lang.name}
          </button>
        );
      })}
    </div>

    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '20px' }}>
      <button className="btn small" type="button" onClick={onRetakeTest}>
        🧪 Пройти тест уровня заново
      </button>
      <button className="btn small danger" type="button" onClick={onResetProgress}>
        Сбросить весь прогресс
      </button>
    </div>
  </div>
));
SettingsPanel.displayName = 'SettingsPanel';

const AppUpdateCard = React.memo<{ onCheckUpdates?: () => void }>(({ onCheckUpdates }) => {
  const versionInfo = useMemo(() => getAppVersionInfo(), []);

  return (
    <div className="card" style={{ marginTop: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontFamily: 'Unbounded', fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🔄</span> Обновление приложения
          </div>
          <div style={{ fontSize: '13px', marginTop: '6px', color: 'var(--text-muted, #666)' }}>
            <div>Версия приложения: <b>v{versionInfo.appVersion}</b> (сборка {versionInfo.appBuild})</div>
            <div style={{ marginTop: '3px' }}>
              Веб-бандл: <b>{versionInfo.bundleVersion}</b>{' '}
              {versionInfo.hasLiveBundle ? (
                <span className="chip sun" style={{ fontSize: '11px', padding: '1px 6px' }}>OTA live</span>
              ) : (
                <span className="chip" style={{ fontSize: '11px', padding: '1px 6px' }}>встроенный</span>
              )}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            className="btn small"
            type="button"
            onClick={() => onCheckUpdates?.()}
            style={{ fontWeight: 600 }}
          >
            🔍 Проверить обновления
          </button>
          {versionInfo.hasLiveBundle && (
            <button
              className="btn small"
              type="button"
              onClick={() => {
                if (window.confirm('Сбросить скачанное OTA-обновление и вернуться к встроенной в APK версии?')) {
                  UpdateService.getInstance().rollbackToAssets();
                }
              }}
              title="Откат к базовой встроенной версии"
            >
              Сброс OTA
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
AppUpdateCard.displayName = 'AppUpdateCard';

export const ProfileView: React.FC<ProfileViewProps> = ({
  userState,
  onUpdateState,
  onRetakeTest,
  onResetProgress,
  onOpenAuth,
  onSignOut,
  onCheckUpdates,
}) => {
  const { currentRank, nextRank, nextXp } = StorageService.getRank(userState.xp);
  const xpPct = nextRank ? Math.min(100, Math.round((userState.xp / nextXp) * 100)) : 100;

  // A single date key is enough to invalidate both day-scoped memos when the
  // clock rolls over midnight, so the screen never keeps yesterday's numbers.
  const today = getLocalDateKey();

  // `userState.history` is mutated in place (`StorageService.updateStreak` pushes
  // onto the same array), so the array identity is not a usable dependency here.
  // The state object is spread into a new one on every commit, which is the
  // signal that the day keys or the active flags may have changed.
  const histList = useMemo(() => buildHistoryStrip(userState.history), [userState, today]);

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    userState.name = e.target.value;
    if (userState.account.isAuth) {
      userState.account.name = e.target.value;
    }
    StorageService.save(userState);
    onUpdateState({ ...userState });
  }, [userState, onUpdateState]);

  const handleSelectAvatar = useCallback((av: string) => {
    audioService.playClick();
    userState.avatar = av;
    StorageService.save(userState);
    onUpdateState({ ...userState });
  }, [userState, onUpdateState]);

  const handlePickPhoto = useCallback((file: File | null, input: HTMLInputElement) => {
    if (!file) return;
    fileToAvatarDataUrl(file)
      .then((dataUrl) => {
        audioService.playSuccess();
        userState.avatar = dataUrl;
        StorageService.save(userState);
        onUpdateState({ ...userState });
      })
      .catch((error: Error) => {
        audioService.playError();
        toastService.show(`Не удалось загрузить фото: ${error.message}`);
      })
      // Reset the input so picking the same file twice still fires onChange.
      .finally(() => {
        input.value = '';
      });
  }, [userState, onUpdateState]);

  const handleClearPhoto = useCallback(() => {
    audioService.playClick();
    userState.avatar = AVATARS[0];
    StorageService.save(userState);
    onUpdateState({ ...userState });
  }, [userState, onUpdateState]);


  const handleSelectLang = useCallback((code: LanguageCode) => {
    audioService.playClick();
    StorageService.ensureLangProgress(userState, code);
    userState.currentLang = code;
    StorageService.save(userState);
    onUpdateState({ ...userState });
  }, [userState, onUpdateState]);


  return (
    <div className="view">
      <div className="overline">личный профиль</div>
      <h1 className="display">Профиль ученика</h1>

      <ProfileHeader
        userState={userState}
        xpPct={xpPct}
        currentRank={currentRank}
        nextRank={nextRank}
        nextXp={nextXp}
        onNameChange={handleNameChange}
      />

      {/* Paid features are intentionally disabled while the catalogue is being expanded. */}
      <div className="card" style={{ marginTop: '16px', background: 'linear-gradient(135deg, rgba(14, 138, 109, 0.12), rgba(124, 199, 232, 0.18))' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontFamily: 'Unbounded', fontSize: '18px', fontWeight: 800 }}>
              🌊 Полный доступ открыт
            </div>
            <p className="sub" style={{ fontSize: '13.5px', marginTop: '4px' }}>
              Все уровни, уроки, словарь и тренажёр доступны бесплатно. Платные ограничения временно отключены.
            </p>
          </div>
        </div>
      </div>

      <SyncPanel
        email={userState.account.email}
        isAuth={userState.account.isAuth}
        onSignIn={onOpenAuth}
        onSignOut={onSignOut}
      />

      <AppUpdateCard onCheckUpdates={onCheckUpdates} />


      <MasteryGrid userState={userState} today={today} />

      <HistoryHeatmap days={histList} />

      <AchievementsGrid userState={userState} />

      <SettingsPanel
        userState={userState}
        onSelectAvatar={handleSelectAvatar}
        onPickPhoto={handlePickPhoto}
        onClearPhoto={handleClearPhoto}

        onSelectLang={handleSelectLang}
        onRetakeTest={onRetakeTest}
        onResetProgress={onResetProgress}
      />
    </div>
  );
};
