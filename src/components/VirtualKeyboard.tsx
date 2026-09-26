import React, { useId, useState } from 'react';
import { LANGUAGES } from '../data/languages';
import { VIRTUAL_KEYBOARDS } from '../data/virtualKeyboard';
import { LanguageCode } from '../types';
import { Icon } from './icons';

interface VirtualKeyboardProps {
  lang: LanguageCode;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  defaultOpen?: boolean;
}

function removeLastCharacter(value: string) {
  return Array.from(value).slice(0, -1).join('');
}

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({
  lang,
  value,
  onChange,
  disabled = false,
  defaultOpen = false,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const [shifted, setShifted] = useState(false);
  const panelId = useId();
  const layout = VIRTUAL_KEYBOARDS[lang] || VIRTUAL_KEYBOARDS.en;
  const language = LANGUAGES[lang] || LANGUAGES.en;

  const insert = (key: string) => {
    const nextKey = shifted && layout.hasCase ? key.toLocaleUpperCase(lang) : key;
    onChange(value + nextKey);
    if (shifted) setShifted(false);
  };

  const buttonMouseDown = (event: React.MouseEvent<HTMLButtonElement>) => {
    // Keep the text field focused when the user taps a keyboard key.
    event.preventDefault();
  };

  return (
    <div className="virtual-keyboard">
      <button
        type="button"
        className="virtual-keyboard-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
      >
        <Icon name="keyboard" />
        <span>Виртуальная клавиатура · {language.name}</span>
        <span className="virtual-keyboard-toggle-state">{open ? 'Скрыть' : 'Открыть'}</span>
      </button>

      {open && (
        <div className="virtual-keyboard-panel" id={panelId} aria-label={`Клавиатура для ${language.name}`}>
          <div className="virtual-keyboard-hint">
            Нажми на символ, чтобы вставить его в ответ. Раскладка меняется вместе с языком.
          </div>
          <div className="virtual-keyboard-rows">
            {layout.rows.map((row, rowIndex) => (
              <div className="virtual-keyboard-row" key={`${lang}-${rowIndex}`}>
                {row.map((key) => (
                  <button
                    type="button"
                    className="virtual-key"
                    key={`${lang}-${rowIndex}-${key}`}
                    disabled={disabled}
                    onMouseDown={buttonMouseDown}
                    onClick={() => insert(key)}
                    aria-label={`Вставить ${key}`}
                  >
                    {shifted && layout.hasCase ? key.toLocaleUpperCase(lang) : key}
                  </button>
                ))}
              </div>
            ))}
          </div>
          <div className="virtual-keyboard-actions">
            {layout.hasCase && (
              <button
                type="button"
                className={`virtual-key virtual-key-action ${shifted ? 'is-active' : ''}`}
                disabled={disabled}
                onMouseDown={buttonMouseDown}
                onClick={() => setShifted((current) => !current)}
                aria-pressed={shifted}
                aria-label="Переключить регистр"
              >
                <Icon name="shift" /> Регистр
              </button>
            )}
            <button
              type="button"
              className="virtual-key virtual-key-space"
              disabled={disabled}
              onMouseDown={buttonMouseDown}
              onClick={() => insert(' ')}
              aria-label="Пробел"
            >
              Пробел
            </button>
            <button
              type="button"
              className="virtual-key virtual-key-action"
              disabled={disabled || value.length === 0}
              onMouseDown={buttonMouseDown}
              onClick={() => onChange(removeLastCharacter(value))}
              aria-label="Удалить последний символ"
            >
              <Icon name="backspace" />
            </button>
            <button
              type="button"
              className="virtual-key virtual-key-action"
              disabled={disabled || value.length === 0}
              onMouseDown={buttonMouseDown}
              onClick={() => onChange('')}
              aria-label="Очистить поле"
            >
              Очистить
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
