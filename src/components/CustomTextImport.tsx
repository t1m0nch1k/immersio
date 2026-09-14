import React, { useState } from 'react';
import { Lesson, UserState, TextPiece } from '../types';
import { WORDS } from '../data/words';
import { StorageService } from '../services/storageService';
import { audioService } from '../services/audioService';

interface CustomTextImportProps {
  userState: UserState;
  onSaveCustomLesson: (lesson: Lesson) => void;
  onNavigate: (route: string) => void;
}

export const CustomTextImport: React.FC<CustomTextImportProps> = ({
  userState,
  onSaveCustomLesson,
  onNavigate,
}) => {
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('📖');
  const [rawText, setRawText] = useState('');
  const [error, setError] = useState('');

  // Sample quick templates
  const presets = [
    {
      title: 'Утренний кофе и планы',
      emoji: '☕',
      text: 'Каждое утро я пью кофе и читаю книгу. Мой друг пишет мне письмо про путешествие в город. Сегодня прекрасная погода и светит солнце.'
    },
    {
      title: 'Встреча в аэропорту',
      emoji: '✈️',
      text: 'В аэропорту много людей. Я покупаю билет на поезд и жду подругу. У неё большой чемодан и отличные новости про работу.'
    },
    {
      title: 'Прогулка у моря',
      emoji: '🌊',
      text: 'Мы идём на пляж смотреть на море. Вода очень тёплая, а ветер приносит свежесть. Вечером мы поедем в ресторан ужинать.'
    }
  ];

  const handleApplyPreset = (preset: typeof presets[0]) => {
    audioService.playClick();
    setTitle(preset.title);
    setEmoji(preset.emoji);
    setRawText(preset.text);
    setError('');
  };

  const handleProcessAndSave = () => {
    if (!title.trim() || !rawText.trim()) return;

    if (rawText.length > 5000) {
      setError('Текст слишком большой. Максимальный размер — 5000 символов.');
      return;
    }

    audioService.playSuccess();

    // Tokenize text: split into sentences, then match words against dictionary
    const sentences = rawText.split(/(?<=[.!?])\s+|\r?\n+/).filter(Boolean);

    // Build dictionary index by russian word
    const wordRuIndex: Record<string, string> = {};
    WORDS.forEach((w) => {
      const lower = w.ru.toLowerCase();
      wordRuIndex[lower] = w.id;
    });

    const parsedSentences: TextPiece[][] = sentences.map((sentence) => {
      const tokens = sentence.split(/(\s+|[.,:;!?…—–«»()%:"“”])/).filter(Boolean);
      const pieceArr: TextPiece[] = [];

      tokens.forEach((token) => {
        const cleanWord = token.trim().toLowerCase().replace(/^[.,:;!?…—–«»()%:"“”]+|[.,:;!?…—–«»()%:"“”]+$/g, '');
        if (cleanWord && wordRuIndex[cleanWord]) {
          pieceArr.push({ id: wordRuIndex[cleanWord], ru: token });
        } else {
          pieceArr.push(token);
        }
      });

      return pieceArr;
    });

    const customLesson: Lesson = {
      id: `custom_${Date.now()}`,
      title: title.trim(),
      emoji: emoji || '📖',
      lvl: 2,
      description: 'Пользовательский текст для погружения',
      sent: parsedSentences,
    };

    userState.customLessons.push(customLesson);
    StorageService.save(userState);
    StorageService.checkAndUnlockAchievements(userState, () => {});

    onSaveCustomLesson(customLesson);
  };

  return (
    <div className="view">
      <div className="overline">конструктор текстов</div>
      <h1 className="display">Свой текст для погружения</h1>
      <p className="sub">
        Вставь любой собственный текст (новость, статью, отрывок из книги), и система автоматически распознает знакомые слова и адаптирует его под твой уровень погружения!
      </p>

      {/* Preset templates */}
      <div style={{ marginTop: '20px' }}>
        <div style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--pine3)', marginBottom: '10px' }}>
          Быстрые шаблоны:
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {presets.map((p, idx) => (
            <button
              key={idx}
              className="btn small"
              onClick={() => handleApplyPreset(p)}
            >
              {p.emoji} {p.title}
            </button>
          ))}
        </div>
      </div>

      {/* Editor Form */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          <input
            type="text"
            placeholder="Эмодзи"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            style={{ width: '70px', padding: '10px', fontSize: '20px', textAlign: 'center', border: '2px solid var(--ink)', borderRadius: '12px', background: 'var(--card)' }}
          />
          <input
            type="text"
            placeholder="Название урока (например, Моя первая статья)"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setError('');
            }}
            style={{ flex: 1, padding: '12px 16px', fontSize: '16px', fontWeight: 700, border: '2px solid var(--ink)', borderRadius: '12px', background: 'var(--card)' }}
          />
        </div>

        <textarea
          rows={7}
          placeholder="Вставь текст на русском языке здесь..."
          value={rawText}
          maxLength={5000}
          onChange={(e) => {
            setRawText(e.target.value);
            setError('');
          }}
          style={{ width: '100%', padding: '14px', fontSize: '16px', lineHeight: 1.6, border: '2px solid var(--ink)', borderRadius: '14px', background: 'var(--card)', color: 'var(--ink)', resize: 'vertical' }}
        />

        {error && <div className="errorbox" role="alert">{error}</div>}

        <div style={{ display: 'flex', gap: '12px', marginTop: '18px', justifyContent: 'flex-end' }}>
          <button className="btn ghost" onClick={() => onNavigate('lessons')}>
            Отмена
          </button>
          <button
            className="btn sun big"
            disabled={!title.trim() || !rawText.trim()}
            onClick={handleProcessAndSave}
          >
            ✨ Создать урок и погрузиться →
          </button>
        </div>
      </div>
    </div>
  );
};
