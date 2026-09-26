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

## Android-приложение

Android-оболочка упаковывает существующий сайт без отдельной реализации учебных экранов. [Сборка APK и ограничения](android/README.md) · [план проверки и выпуска](ANDROID_NATIVE_PLAN.md).

## Проверки проекта

```bash
npm run lint   # tsc --noEmit, strict + noUnusedLocals
npm test       # грамматика, иммерсия, хранилище, SRS, PBKDF2
npm run build  # tsc + vite build
```

Тесты лежат в `tests/` и запускаются обычным `node` без фреймворка: TypeScript-модули собираются esbuild и импортируются напрямую.

## Архитектура

```
src/
  data/       статический контент: словарь (~3500 слов), уроки, грамматика, алфавиты
  services/   бизнес-логика: иммерсия, SRS, хранилище, план, озвучка, хеширование паролей
  components/ экраны и виджеты
  utils/      общие хелперы: shuffle, доступ к словарю, пул дистракторов
  routes.ts   список маршрутов и тип Route
```

Состояние пользователя целиком лежит в `localStorage` под ключом `pogruzhenie_v2` и валидируется при каждой загрузке: неизвестные поля отбрасываются, битые записи SRS и уроков удаляются, устаревший формат хеша пароля принудительно сбрасывается. Учебный контент не загружается с сервера — единственный сетевой вызов это `/api/tts`.

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

GitHub Actions автоматически проверяет типы, тесты и production-сборку для push и pull request, а отдельный workflow собирает debug-APK. Секреты из `.env` и локальные сборки в репозиторий не попадут.

## Vercel

1. В Vercel выбери **Add New → Project** и импортируй GitHub-репозиторий.
2. Framework Preset: **Vite**.
3. Build Command: `npm run build`.
4. Output Directory: `dist`.
5. Нажми **Deploy**.

Настройки уже зафиксированы в `vercel.json`, включая security-заголовки (CSP, HSTS, nosniff) и зафиксированную версию Python-рантайма. Production-озвучка работает через `api/tts.py` и использует Edge-TTS с ограничением частоты запросов; CORS включён только для доменов из `TTS_ALLOWED_ORIGINS`. Переменные окружения не обязательны: в проекте есть безопасные значения голосов по умолчанию.

Не добавляй в GitHub реальные ключи Azure или другие секреты. Для бесплатного режима достаточно Edge-TTS и встроенного fallback на Google TTS.

## Поддерживаемые языки

English, Español, Deutsch, Français, Italiano, 日本語, Slovenčina и Čeština.

Полный нативный текст уроков (вкладка «Оригинал» и погружение на 100%) есть только для English, Slovenčina и Čeština; для остальных языков ридер работает по словарю и подмешивает переводы слов.
