import React from 'react';
import { UserState, LanguageCode } from '../types';
import { LANGUAGES } from '../data/languages';
import { ACHIEVEMENTS } from '../data/achievements';
import { LESSONS } from '../data/lessons';
import { WORDS } from '../data/words';
import { StorageService, getLocalDateKey } from '../services/storageService';
import { audioService } from '../services/audioService';

interface ProfileViewProps {
  userState: UserState;
  onUpdateState: (newState: UserState) => void;
  onRetakeTest: () => void;
  onResetProgress: () => void;
  onOpenAuth: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  userState,
  onUpdateState,
  onRetakeTest,
  onResetProgress,
  onOpenAuth,
}) => {
  const currentLang = userState.currentLang;
  const langProg = StorageService.getLangProgress(userState, currentLang);
  const langObj = LANGUAGES[currentLang] || LANGUAGES.en;

  const { currentRank, nextRank, nextXp } = StorageService.getRank(userState.xp);
  const xpPct = nextRank ? Math.min(100, Math.round((userState.xp / nextXp) * 100)) : 100;

  // 14-day heatmap history
  const todayObj = new Date();
  const histList: { dateStr: string; isActive: boolean }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(todayObj.getDate() - i);
    const dateStr = getLocalDateKey(d);
    histList.push({
      dateStr,
      isActive: userState.history.includes(dateStr),
    });
  }

  const AVATARS = ['🦊', '🐼', '🦉', '🐸', '🐙', '🦄', '🐯', '🐨', '🦁', '🐹', '🐳', '🦜', '🐢', '🦋', '🐝', '🤖'];
  const todayActivity = langProg.dailyActivity[getLocalDateKey()];
  const languageCodes = Object.keys(LANGUAGES) as LanguageCode[];
  const levelLabels = ['A1', 'A2', 'B1', 'B2/C1'];

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    userState.name = e.target.value;
    if (userState.account.isAuth) {
      userState.account.name = e.target.value;
    }
    StorageService.save(userState);
    onUpdateState({ ...userState });
  };

  const handleSelectAvatar = (av: string) => {
    audioService.playClick();
    userState.avatar = av;
    StorageService.save(userState);
    onUpdateState({ ...userState });
  };

  const handleSelectLang = (code: LanguageCode) => {
    audioService.playClick();
    StorageService.ensureLangProgress(userState, code);
    userState.currentLang = code;
    StorageService.save(userState);
    onUpdateState({ ...userState });
  };

  const handleLogout = () => {
    audioService.playClick();
    userState.account.isAuth = false;
    StorageService.save(userState);
    onUpdateState({ ...userState });
  };

  return (
    <div className="view">
      <div className="overline">личный профиль</div>
      <h1 className="display">Профиль ученика</h1>

      {/* Header Profile Card */}
      <div className="card phead" style={{ marginTop: '18px' }}>
        <div className="avatar" style={{ position: 'relative' }}>
          {userState.avatar}
        </div>

        <div style={{ flex: 1, minWidth: '240px' }}>
          <div className="pname">
            <input
              maxLength={20}
              placeholder="Твоё имя"
              value={userState.name}
              onChange={handleNameChange}
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

      {/* Account Info & Auth status */}
      <div className="card" style={{ marginTop: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--pine3)' }}>
              Учётная запись
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, marginTop: '4px' }}>
              {userState.account.isAuth ? userState.account.email : 'Гостевой режим'}
            </div>
          </div>

          {userState.account.isAuth ? (
            <button className="btn small danger" onClick={handleLogout}>
              Выйти из аккаунта
            </button>
          ) : (
            <button className="btn small sun" onClick={onOpenAuth}>
              Зарегистрироваться / Войти
            </button>
          )}
        </div>
      </div>

      {/* 4 Stat Boxes */}
      <div className="stats">
        <div className="card stat fire">
          <b>🔥 {userState.streak.current}</b>
          <span>текущий стрик (дн.)</span>
        </div>
        <div className="card stat">
          <b>🏅 {userState.streak.best}</b>
          <span>макс. стрик (дн.)</span>
        </div>
        <div className="card stat sea">
          <b>{langProg.learnedWords.length}</b>
          <span>слов в словаре</span>
        </div>
        <div className="card stat">
          <b>⚡ {userState.xp}</b>
          <span>опыта всего (XP)</span>
        </div>
      </div>

      <div className="card mastery-section">
        <div className="section-heading">
          <div>
            <div className="overline">карта прогресса</div>
            <h2>Мастерство по языкам</h2>
          </div>
          <p>Сколько слов и уроков уже закреплено на каждом уровне.</p>
        </div>
        <div className="mastery-grid">
          {languageCodes.map((code) => {
            const language = LANGUAGES[code];
            const progress = StorageService.getLangProgress(userState, code);
            const learned = new Set(progress.learnedWords);
            const today = progress.dailyActivity[getLocalDateKey()];
            const completedLessons = Object.keys(progress.doneLessons).length;

            return (
              <article className={`mastery-card ${code === currentLang ? 'current' : ''}`} key={code}>
                <div className="mastery-head">
                  <b>{language.flag} {language.name}</b>
                  <span>{learned.size} слов</span>
                </div>
                <div className="mastery-meta">{completedLessons}/{LESSONS.length} уроков · {today?.minutes || 0} мин сегодня</div>
                <div className="mastery-levels">
                  {[1, 2, 3, 4].map((level) => {
                    const levelWords = WORDS.filter((word) => word.lvl === level);
                    const knownCount = levelWords.filter((word) => learned.has(word.id)).length;
                    const levelPct = levelWords.length ? Math.round((knownCount / levelWords.length) * 100) : 0;
                    return (
                      <div className="mastery-level" key={level}>
                        <span>{levelLabels[level - 1]}</span>
                        <div className="mastery-bar"><i style={{ width: `${levelPct}%` }} /></div>
                        <small>{knownCount}/{levelWords.length}</small>
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* 14-day Heatmap */}
      <div className="card" style={{ marginTop: '16px' }}>
        <h3 style={{ fontSize: '15px', marginBottom: '8px' }}>
          Активность за последние 14 дней
        </h3>
        <div className="hgrid">
          {histList.map((item, idx) => (
            <div
              key={idx}
              className={`hg ${item.isActive ? 'on' : ''}`}
              title={item.dateStr}
            ></div>
          ))}
        </div>
      </div>

      {/* Achievements Grid */}
      <div className="card" style={{ marginTop: '16px' }}>
        <h3 style={{ fontSize: '15.5px', marginBottom: '12px' }}>
          Достижения и награды · {userState.achievements.length}/{ACHIEVEMENTS.length}
        </h3>
        <div className="agrid">
          {ACHIEVEMENTS.map((ach) => {
            const isUnlocked = userState.achievements.includes(ach.id);
            return (
              <div key={ach.id} className={`ach ${isUnlocked ? '' : 'lock'}`}>
                <span className="ico">{ach.ico}</span>
                <b>{ach.name}</b>
                <span>{ach.desc}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Settings Section */}
      <div className="card" style={{ marginTop: '16px' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Настройки профиля</h3>

        <div className="overline" style={{ marginTop: '8px' }}>
          Аватар
        </div>
        <div className="avgrid">
          {AVATARS.map((av) => (
            <button
              key={av}
              className={`av ${av === userState.avatar ? 'cur' : ''}`}
              onClick={() => handleSelectAvatar(av)}
            >
              {av}
            </button>
          ))}
        </div>

        <div className="overline" style={{ marginTop: '16px' }}>
          Изучаемый язык
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
          {(Object.keys(LANGUAGES) as LanguageCode[]).map((code) => {
            const lang = LANGUAGES[code];
            return (
              <button
                key={code}
                className={`btn small ${code === userState.currentLang ? 'sun' : ''}`}
                onClick={() => handleSelectLang(code)}
              >
                {lang.flag} {lang.name}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '20px' }}>
          <button className="btn small" onClick={onRetakeTest}>
            🧪 Пройти тест уровня заново
          </button>
          <button className="btn small danger" onClick={onResetProgress}>
            Сбросить весь прогресс
          </button>
        </div>
      </div>
    </div>
  );
};
