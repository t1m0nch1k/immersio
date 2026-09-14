# Погружение 🌊

Приложение для постепенного изучения языков: интерактивные тексты, словарь, интервальное повторение, грамматика, построение предложений, слушание и Edge-TTS.

## Локальный запуск

Требования: Node.js 20+ и Python 3.12+.

```bash
npm ci
python -m pip install -r requirements.txt
npm run dev
```

После запуска открой `http://localhost:3000`.

Проверки проекта:

```bash
npm run lint
npm run test:grammar
npm run build
```

## GitHub

1. Создай пустой репозиторий на GitHub.
2. В корне проекта выполни:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<username>/<repository>.git
git push -u origin main
```

GitHub Actions автоматически проверяет типы, грамматические тесты и production-сборку для push и pull request. Секреты из `.env` и локальные сборки в репозиторий не попадут.

## Vercel

1. В Vercel выбери **Add New → Project** и импортируй GitHub-репозиторий.
2. Framework Preset: **Vite**.
3. Build Command: `npm run build`.
4. Output Directory: `dist`.
5. Нажми **Deploy**.

Настройки уже зафиксированы в `vercel.json`. Production-озвучка работает через `api/tts.py` на Python Runtime Vercel и использует Edge-TTS. Переменные окружения не обязательны: в проекте есть безопасные значения голосов по умолчанию. При необходимости голоса и скорость можно переопределить переменными из `.env.example` в настройках Vercel.

Не добавляй в GitHub реальные ключи Azure или другие секреты. Для бесплатного режима достаточно Edge-TTS и встроенного fallback на Google TTS.

## Поддерживаемые языки

English, Español, Deutsch, Français, Italiano, 日本語, Slovenčina и Čeština.
