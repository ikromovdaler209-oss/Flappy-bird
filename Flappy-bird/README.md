# Flying Bird — аккуратная структура проекта (v2.3)

Эта версия **не переписывает физику и Firebase**: код взят из протестированной сборки Multiplayer Fullscreen v2.2, а 7 исходных `<script>` перенесены в отдельные файлы **в прежнем порядке**. Основной игровой цикл пока остаётся единым `src/game/solo.js`, так как агрессивная разбивка его замыканий и глобальных переменных может сломать игровой процесс. Графика игры по-прежнему программно рисуется на Canvas; PNG-модели труб и птиц не требуются.

## Файлы и назначение

```
Flying-Bird/               ← сюда помещается содержимое архива, ЭТО корень репозитория
├── index.html             ← только HTML-интерфейс и подключения
├── manifest.json          ← название игры и иконки для установки
├── icon.png               ← совместимость со старыми ссылками
├── apple-touch-icon.png   ← совместимость со старыми ссылками
├── src/
│   ├── config/runtime.js  ← общая настройка URL RTDB
│   ├── game/solo.js        ← движок, физика, карты, меню и Canvas
│   ├── ui/account-localization.js
│   ├── firebase/account-cloud.js
│   ├── firebase/friends.js
│   ├── firebase/leaderboards.js
│   └── multiplayer/multiplayer.js
├── styles/
│   ├── game.css           ← основное полотно и окна аккаунта
│   ├── overlays.css       ← друзья, конфиденциальность, лидерборды
│   └── multiplayer.css    ← лобби, гонка, адаптивность
├── assets/icons/          ← PNG 16–1024, favicon.ico, iPhone, maskable
├── tools/serve.mjs        ← локальный сервер (без зависимостей)
├── tools/check.mjs        ← синтаксис JS + файловые пути
├── package.json
├── .gitignore
└── README.md
```

## Важно: адрес Realtime Database

Если в текущем развернутом `index.html` у тебя был заполнен `window.FLYING_BIRD_RTDB_URL`, перенеси тот же адрес в **`src/config/runtime.js`**. У исходной v2.2, из которой собран архив, это поле оставлено пустым (`''`).

```
window.FLYING_BIRD_RTDB_URL = 'https://ТВОЙ-АДРЕС-БАЗЫ';
```

Это **публичный endpoint**, а не секретный пароль. Он должен совпадать с адресом проекта, в котором настроены RTDB Rules. Без заполнения у нового игрока может снова появиться запрос URL. Не вставляй сервисные ключи, токены администратора или приватные `.env` в браузерный код.

## Локальный запуск

На Mac с установленным Node.js, из папки проекта:

```bash
npm run check
npm run dev
```

Открой `http://localhost:8000`. Не открывай `index.html` через `file://`: JavaScript-модули Firebase и относительные пути обычно требуют HTTP(S).

## Перенос текущего GitHub-проекта (важно!)

В последних логах Git у тебя **вложенный** файл `/Users/dalerikromov/Flappy-bird/Flappy-bird/index.html` и Render Publish Directory `Flappy-bird`. Ты хотел один корень без вложенной папки. Рекомендованная миграция:

1. Сделай резервную копию текущего проекта за пределами папки репозитория.
2. Открой в Finder `/Users/dalerikromov/Flappy-bird` — там находится `.git`. **Не удаляй `.git` и не выполняй `git init`.**
3. Распакуй содержимое ZIP **прямо в корень** `/Users/dalerikromov/Flappy-bird/`, чтобы новый `index.html` лежал рядом с `.git`, `src/` и `assets/`.
4. Убедись, что настройка `src/config/runtime.js` содержит настоящий URL RTDB.
5. Удали **старый вложенный** `Flappy-bird/index.html`, когда проверишь новый сайт. Не удаляй старую папку вслепую, если в ней есть другие полезные файлы/ресурсы.
6. Отправь изменения в GitHub. В Render зайди в **Settings → Publish Directory** и замени `Flappy-bird` на `.`. После сохранения сделай Manual Deploy → Deploy latest commit. Пока эта настройка не изменена, Render продолжит показывать старый вложенный сайт.

```bash
cd ~/Flappy-bird
npm run check
git status --short
git add index.html manifest.json package.json .gitignore README.md src styles assets tools
git add -u Flappy-bird/index.html
git commit -m "Refactor Flying Bird structure and add app icon"
git push origin main
```

> Если ты удалил старый вложенный `index.html`, `git add -u` зафиксирует его удаление. Если оставил — он останется в репозитории, но после переключения Publish Directory `.` Render будет использовать новый корневой `index.html`. Не применяй `git add -A` вслепую, если в репозитории накопились временные файлы.

## Иконка

Основная версия — пиксельная красно-оранжевая птица с золотой короной на голубом фоне с облаками и зелёными трубами. Сгенерированный арт адаптирован под разные размеры:

- `assets/icons/icon-1024.png` — основной арт.
- `assets/icons/icon-512.png`, `icon-256.png`, `icon-128.png` — обложки и ресурсы.
- `assets/icons/favicon-32.png`, `favicon.ico` — вкладка браузера.
- `assets/icons/apple-touch-icon.png` — 180 × 180 для iPhone.
- `assets/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` — Android/PWA manifest.

Браузер иногда сохраняет старую иконку в кэше: проверяй в приватном окне или обновляй кеш.

## Как расширять проект

Новые независимые функции добавляй в отдельные файлы. Если захочешь разбить большой `solo.js` на `physics.js`, `render.js`, `shop.js`, сначала придётся вынести общий игровой state из его IIFE и переподключить зависимости: простое разрезание этого блока по функциям может сломать игру.

## Чего намеренно не менял

- RTDB/Firestore rules, схема данных и авторизация.
- Правила Last Bird Standing, карты, физика и мультиплеерная синхронизация.
- Сохранения пользователя в localStorage и Firebase.
- Мобильные меню и существующие обработчики ввода.

После перехода на новую структуру сначала проверь одиночный режим, потом аккаунт и магазин, потом создание комнаты и онлайн-гонку на двух устройствах.
