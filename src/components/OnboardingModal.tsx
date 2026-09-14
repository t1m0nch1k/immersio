import React, { useEffect, useState } from 'react';
import { LanguageCode, UserState } from '../types';
import { LANGUAGES } from '../data/languages';
import { WORDS, WORD_MAP } from '../data/words';
import { StorageService } from '../services/storageService';
import { audioService } from '../services/audioService';
import confetti from 'canvas-confetti';

interface OnboardingModalProps {
  userState: UserState;
  isRetakeOnly?: boolean;
  onComplete: (newState: UserState) => void;
  onClose: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  userState,
  isRetakeOnly = false,
  onComplete,
  onClose,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(isRetakeOnly ? 2 : 1);
  const [selectedLang, setSelectedLang] = useState<LanguageCode>(userState.currentLang || 'en');
  const [testQuestions, setTestQuestions] = useState<
    { id: string; word: string; opts: string[] }[]
  >([]);
  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [correctIds, setCorrectIds] = useState<string[]>([]);
  const [nameInput, setNameInput] = useState(userState.name || '');
  const [selectedAvatar, setSelectedAvatar] = useState(userState.avatar || '🦊');

  const AVATARS = ['🦊', '🐼', '🦉', '🐸', '🐙', '🦄', '🐯', '🐨', '🦁', '🐹', '🐳', '🦜', '🐢', '🦋', '🐝', '🤖'];

  const shuffle = <T,>(arr: T[]): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const generateTest = (lang: LanguageCode) => {
    const byL: Record<number, typeof WORDS> = { 1: [], 2: [], 3: [], 4: [] };
    WORDS.forEach((w) => {
      byL[w.lvl].push(w);
    });

    const picked = [
      ...shuffle(byL[1]).slice(0, 5),
      ...shuffle(byL[2]).slice(0, 5),
      ...shuffle(byL[3]).slice(0, 5),
      ...shuffle(byL[4]).slice(0, 5),
    ];

    return picked.map((w) => {
      const targetWord = w[lang] || w.en;
      const pool = shuffle(WORDS.filter((x) => x.id !== w.id && x.ru !== w.ru))
        .slice(0, 3)
        .map((x) => x.ru);

      return {
        id: w.id,
        word: targetWord,
        opts: shuffle([w.ru, ...pool]),
      };
    });
  };

  // A retake starts directly on the test step, so generate its questions on mount.
  useEffect(() => {
    if (!isRetakeOnly || testQuestions.length > 0) return;
    const qs = generateTest(selectedLang);
    setTestQuestions(qs);
    setQIndex(0);
    setScore(0);
    setCorrectIds([]);
  }, [isRetakeOnly, selectedLang]);

  const handleStartTest = () => {
    audioService.playClick();
    const qs = generateTest(selectedLang);
    setTestQuestions(qs);
    setQIndex(0);
    setScore(0);
    setCorrectIds([]);
    setStep(2);
  };

  const handleAnswerQ = (chosenRu: string) => {
    const q = testQuestions[qIndex];
    const word = WORD_MAP[q.id];
    const isCorrect = word && word.ru === chosenRu;

    if (isCorrect) {
      audioService.playSuccess();
      setScore((prev) => prev + 1);
      setCorrectIds((prev) => [...prev, q.id]);
    } else {
      audioService.playError();
    }

    if (qIndex + 1 < testQuestions.length) {
      setQIndex((prev) => prev + 1);
    } else {
      setStep(3);
    }
  };

  const getImmersionFromScore = (s: number) => {
    if (s <= 5) return { label: 'A1 · С нуля', immersion: 10 };
    if (s <= 10) return { label: 'A2 · Базовый', immersion: 20 };
    if (s <= 15) return { label: 'B1 · Уверенный', immersion: 30 };
    return { label: 'B2 · Продвинутый', immersion: 40 };
  };

  const handleFinishOnboarding = () => {
    audioService.playFanfare();
    confetti({ particleCount: 70 });

    const lvlInfo = getImmersionFromScore(score);
    userState.onboarded = true;
    userState.currentLang = selectedLang;
    userState.name = nameInput.trim() || 'Путешественник';
    userState.avatar = selectedAvatar;

    const langProg = StorageService.ensureLangProgress(userState, selectedLang);
    langProg.immersion = lvlInfo.immersion;
    langProg.testLvl = lvlInfo.label;

    correctIds.forEach((id) => {
      if (!langProg.learnedWords.includes(id)) {
        langProg.learnedWords.push(id);
      }
    });

    userState.xp += correctIds.length * 2;

    StorageService.save(userState);
    StorageService.checkAndUnlockAchievements(userState, () => {});

    onComplete({ ...userState });
  };

  return (
    <div className="ovl">
      <div className="dlg" role="dialog" aria-modal="true" aria-labelledby="onboarding-dialog-title">
        {/* Step 1: Language selection */}
        {step === 1 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'Unbounded', fontWeight: 800, fontSize: '14px', marginBottom: '14px' }}>
              <div className="mark" style={{ width: '32px', height: '32px' }}>🌊</div>
              ПОГРУЖЕНИЕ
            </div>
            <h2 id="onboarding-dialog-title" style={{ fontFamily: 'Unbounded', fontSize: '24px', marginBottom: '10px' }}>
              Ныряем в новый язык 🌊
            </h2>
            <p className="sub">
              Ты будешь читать интерактивные тексты, где слова изучаемого языка постепенно вытесняют родную речь. Выученные слова навсегда остаются в оригинале!
            </p>

            <p style={{ marginTop: '18px', fontWeight: 800 }}>Какой язык изучаем?</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', margin: '16px 0' }}>
              {(Object.keys(LANGUAGES) as LanguageCode[]).map((code) => {
                const lang = LANGUAGES[code];
                const isSel = selectedLang === code;

                return (
                  <button
                    key={code}
                    className={`lcard ${isSel ? 'sel' : ''}`}
                    onClick={() => {
                      audioService.playClick();
                      setSelectedLang(code);
                    }}
                  >
                    <span className="flag" style={{ fontSize: '32px' }}>{lang.flag}</span>
                    <b>{lang.name}</b>
                    <small style={{ color: 'var(--ink2)' }}>{lang.nativeName}</small>
                  </button>
                );
              })}
            </div>

            <button className="btn sun big" style={{ width: '100%', marginTop: '10px' }} onClick={handleStartTest}>
              Продолжить →
            </button>
          </div>
        )}

        {/* Step 2: Placement test */}
        {step === 2 && testQuestions.length > 0 && (
          <div>
            <h2 style={{ fontFamily: 'Unbounded', fontSize: '22px', marginBottom: '8px' }}>
              Проверка уровня 🧪
            </h2>
            <p className="sub">
              {testQuestions.length} вопросов: по 5 слов на каждый уровень. Угаданные слова сразу попадут в твой словарь!
            </p>

            <div className="obar" style={{ height: '10px', background: 'var(--card)', borderRadius: '99px', margin: '14px 0', border: '2px solid var(--ink)', overflow: 'hidden' }}>
              <i style={{ display: 'block', height: '100%', background: 'linear-gradient(90deg, var(--sun), var(--sun2))', width: `${Math.round((qIndex / testQuestions.length) * 100)}%`, transition: 'width 0.4s' }}></i>
            </div>

            {(() => {
              const q = testQuestions[qIndex];
              return (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ fontSize: '12px', fontFamily: 'JetBrains Mono', color: 'var(--ink2)', marginBottom: '6px' }}>
                    Вопрос {qIndex + 1} из {testQuestions.length}
                  </div>

                  <div className="qword" style={{ fontSize: '24px' }}>
                    {q.word}
                    <button
                      className="iconbtn"
                      style={{ marginLeft: '10px', verticalAlign: 'middle' }}
                      onClick={() => audioService.speak(q.word, selectedLang)}
                    >
                      🔊
                    </button>
                  </div>

                  <div style={{ display: 'grid', gap: '10px', marginTop: '14px' }}>
                    {q.opts.map((opt, idx) => (
                      <button key={idx} className="opt" onClick={() => handleAnswerQ(opt)}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {!isRetakeOnly && (
              <button
                className="btn ghost"
                style={{ marginTop: '16px', width: '100%' }}
                onClick={() => {
                  setScore(0);
                  setStep(4);
                }}
              >
                Пропустить — начать с нуля
              </button>
            )}
          </div>
        )}

        {/* Step 3: Test result */}
        {step === 3 && (
          <div style={{ textAlign: 'center' }}>
            <div className="overline">результат теста</div>
            <div style={{ fontFamily: 'Unbounded', fontSize: '54px', fontWeight: 800, color: 'var(--pine)', margin: '10px 0' }}>
              {score} / {testQuestions.length}
            </div>

            {(() => {
              const info = getImmersionFromScore(score);
              return (
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', margin: '14px 0' }}>
                  <span className="chip sun" style={{ fontSize: '14px' }}>уровень: {info.label}</span>
                  <span className="chip sea" style={{ fontSize: '14px' }}>старт: {info.immersion}% погружения</span>
                </div>
              );
            })()}

            <button
              className="btn sun big"
              style={{ marginTop: '20px', width: '100%' }}
              onClick={() => {
                if (isRetakeOnly) {
                  handleFinishOnboarding();
                  onClose();
                } else {
                  setStep(4);
                }
              }}
            >
              Продолжить дальше →
            </button>
          </div>
        )}

        {/* Step 4: Avatar & Name */}
        {step === 4 && (
          <div>
            <h2 style={{ fontFamily: 'Unbounded', fontSize: '24px', marginBottom: '8px' }}>
              Почти готово! 🎒
            </h2>
            <p className="sub">Как тебя зовут и кто будет твоим напарником в путешествии?</p>

            <input
              className="nameinput"
              maxLength={20}
              placeholder="Твоё имя"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              style={{ width: '100%', border: '2px solid var(--ink)', borderRadius: '12px', padding: '12px 14px', fontSize: '16px', fontWeight: 600, background: 'var(--card)', marginTop: '12px' }}
            />

            <div className="avgrid" style={{ marginTop: '16px' }}>
              {AVATARS.map((av) => (
                <button
                  key={av}
                  className={`av ${av === selectedAvatar ? 'cur' : ''}`}
                  onClick={() => setSelectedAvatar(av)}
                >
                  {av}
                </button>
              ))}
            </div>

            <button
              className="btn sun big"
              style={{ width: '100%', marginTop: '16px' }}
              onClick={handleFinishOnboarding}
            >
              Начать погружение 🌊
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
