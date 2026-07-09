# driverapp — CLAUDE.md

## Стек

- **Backend**: Node.js 20 (Fastify), `ServerNode/src/` (~10 файлов по доменам)
- **Frontend**: Vanilla JS (`Client/app.js` ~2300 строк), HTML/CSS, без фреймворков
- **БД**: SQLite (better-sqlite3) — те же файлы `data/*.db`, сессии в `data/sessions.db`
- **Деплой**: Docker, `docker-compose.yml` (прод) / `docker-compose.dev.yml` (локально)
- **Старый backend**: `ServerLinux/` (ASP.NET Core) — оставлен как reference, не используется
- **Telegram SDK**: удалён полностью (июль 2026). Приложение работает в обычном браузере.

## Серверы

| Окружение | Адрес | Путь |
|-----------|-------|------|
| Продакшн | `89.111.165.211` (root, SSH по ключу) | `/root/site/DriverAppSource_Cortex/` |
| Локальный дев | `http://localhost:8081` | `~/Projects/driverapp/` |
| Продакшн URL | `https://motorsharks.online` | `/driver-app/` (приложение), `/login` |

## Структура проекта

```
Client/
  app.js              — весь клиентский код (~2300 строк)
  index.html          — основное приложение
  login.html          — страница входа (inline CSS+JS, без зависимостей)
  styles.css
  js/
    api.js            — postRequest(url, data), endpoint (resolveEndpoint)
    dom.js            — get(id) = getElementById
    auth.js           — initAuth: проверяет session, вызывает /api/authorize
    carSelector.js    — initCarSelector: поиск/выбор авто
    admin/locations.js
  brandico/           — PNG логотипы брендов (локальные, без CDN)
  assets/             — logo.png, car-illustration.png, login-bg.png

ServerNode/                    — АКТИВНЫЙ БЭКЕНД (Node.js / Fastify)
  src/
    server.js                  — entry point, регистрация плагинов + маршрутов
    db/
      users.js, cars.js, locations.js, routes.js, checkups.js, sessions.js
    routes/
      auth.js, cars.js, locations.js, users.js, checkups.js, routes.js, carcard.js, reports.js
    middleware/auth.js         — requireSession, requireAdmin
    utils/
      base36.js                — encode/decode (совместимо с C# Base36Converter)
      photos.js                — savePhotoFromDataUri
      excel.js                 — appendPreCheckupRow, appendPostCheckupRow, getTablesZip
      accessKeys.js            — одноразовые ключи для /api/get-tables
  tests/                       — интеграционные тесты (vitest)
    auth.test.js, cars.test.js, locations.test.js, users.test.js
    routes.test.js, checkups.test.js, carcard.test.js
  Dockerfile
  package.json

ServerLinux/                   — УСТАРЕЛ (ASP.NET Core), оставлен как reference

data/                 — монтируется в контейнер как volume
  cars.db, users.db, locations.db, checkups.db, routes.db
  sessions.db                  — SQLite-сессии (Node.js, TTL 30 дней)
  car-photos/         — фото авто (имя файла = госномер, напр. В058МО193.jpg)
  Photo/              — фото из чекапов (year/month/date/brand_model_number/)
```

## Локальный запуск

```bash
# Запуск в Docker (порт 8081)
docker-compose -f docker-compose.dev.yml up -d --build

# Запуск напрямую (без Docker, порт 8080)
cd ServerNode && node src/server.js

# Остановка Docker
docker-compose -f docker-compose.dev.yml down

# Логи Docker
docker logs motorsharks-dev

# Тесты
cd ServerNode && npm test
```

Данные дев-контейнера — `./data/` (SQLite + фото).

### Важно: сессии при переходе с .NET
При первом запуске Node.js-бэкенда старые сессии (из `data/sessionstorage`) аннулируются.
Все пользователи должны войти заново. Пароли в открытом виде автоматически мигрируют
в bcrypt при первом успешном входе.

## Деплой на прод

При изменении только клиентских файлов (`.js`, `.html`, `.css`) — пересборка не нужна, копируем напрямую в контейнер:

```bash
scp Client/app.js root@89.111.165.211:/root/site/DriverAppSource_Cortex/Client/app.js
scp Client/index.html root@89.111.165.211:/root/site/DriverAppSource_Cortex/Client/index.html

ssh root@89.111.165.211 "
  docker cp /root/site/DriverAppSource_Cortex/Client/app.js motorsharks:/app/Client/app.js
  docker cp /root/site/DriverAppSource_Cortex/Client/index.html motorsharks:/app/Client/index.html
"
```

При изменении бэкенда (`ServerNode/src/` файлы) — нужна пересборка:

```bash
ssh root@89.111.165.211 "cd /root/site/DriverAppSource_Cortex && docker-compose down && docker-compose up -d --build"
```

## Кэш-бастинг

Текущая версия: `20260707_09`

Версия прописана в **двух местах** — должна совпадать:
1. `Client/app.js` строки 2-7: `const __v = "20260703_01"` + импорты модулей
2. `Client/index.html` строки 9-14: `modulepreload` и `script src`

Менять при **любом** обновлении JS-модулей — иначе Safari/iOS кэширует старые файлы.

## Чекап-форма (PreCheckup)

Данные в объекте `checkUpPreData` (строка ~250 в app.js). Форма — 3 шага.

### Валидация по шагам
- `validatePt1()` — геолокация, 4 угловых фото, 4 фото сторон, фото салона, состояние кузова, колёса, состояние салона
- `validatePt2()` — масло, антифриз, тормоза, омывайка, освещение, аварийный набор, стёкла
- `validatePt3()` — пробег, топливо, приборная панель, СТС, ОСАГО, Wi-Fi, VPN

Ошибки валидации показывают конкретные названия (напр. "Задний правый угол"), не общее "4 угловых фото".

### Фото в PreCheckup

| Поле | HTML id | Описание | Обязательно |
|------|---------|----------|-------------|
| `photo_rl` | `prePhoto_1` | Передний левый угол | Да |
| `photo_rr` | `prePhoto_2` | Передний правый угол | Да |
| `photo_br` | `prePhoto_3` | Задний правый угол | Да |
| `photo_bl` | `prePhoto_4` | Задний левый угол | Да |
| `photo_r`  | `prePhoto_front` | Спереди | Да |
| `photo_b`  | `prePhoto_rear`  | Сзади | Да |
| `photo_l`  | `prePhoto_left`  | Левая сторона | Да |
| `photo_rg` | `prePhoto_right` | Правая сторона | Да |
| `photo_irl` | `prePhoto_5` | Салон — водительская дверь | Да (если `impossibleSwitchPre` не отмечен) |
| `photo_irr` | `prePhoto_6` | Салон — правая передняя дверь | Да (если `impossibleSwitchPre` не отмечен) |
| `photo_ibr` | `prePhoto_7` | Салон — правая задняя дверь | **Нет** |
| `photo_ibl` | `prePhoto_8` | Салон — левая задняя дверь | **Нет** |

`impossibleSwitchPre` — "Фото салона невозможны", скрывает секцию `salonPhotosPre`.

### Добавление фото-блоков
```javascript
// capturePhotoFromFile: file picker → resize до 1920px → base64 JPEG
addPhotoBlock(parentEl, 'Метка', (photoData) => { checkUpPreData.photo_rl = photoData; });
```

## API эндпоинты (основные)

```
POST /api/login        — вход, возвращает session token
POST /api/authorize    — проверка сессии (вызывается при каждом открытии app)
POST /api/pre-checkup  — отправка пре-чекапа
POST /api/post-checkup — отправка пост-чекапа
GET  /api/cars         — список автомобилей (публичный, без сессии)
GET  /api/locations    — список локаций
GET  /api/routes       — маршруты водителя
POST /api/route        — создать маршрут
GET  /api/get-tables              — скачать xlsx (только admin, требует access_key)
POST /api/tech-inspection         — отправка внеочередного тех.осмотра
GET  /driver-app/tech-inspections — отчёт по тех.осмотрам (фильтры + xlsx без фото)
```

Аутентификация через session token в теле JSON: `{ data: {...}, session: "..." }`.  
При свежем логине сессия кэшируется в `sessionStorage.__authData` — `/api/authorize` повторно не вызывается.

## Nginx (прод)

Стоит перед контейнером, слушает 443 (SSL). Конфиг: `/etc/nginx/sites-enabled/default`.  
Проксирует всё на `127.0.0.1:8080`. `client_max_body_size 600M` — для загрузки фото.

## Тех.осмотр (TechInspection)

Внеочередная тех.проверка — третий тип чекапа. Кнопка `offschedule_button` активируется при выборе машины.

**Форма — 2 страницы:**
- Страница 1 (`tech_pt1`): геолокация, 4 угловых + 4 боковых фото, 8 фото колёс (4 колеса × вид+протектор), toggle `techWheelsOkSwitch`
- Страница 2 (`tech_pt2`): 2 обяз.фото салона (вод.+пер.прав двери), 2 необяз. (зад.прав+лев), фото мотора, фото багажа

**DB:** таблица `tech_inspections` в `checkups.db`. Поля колёс: `photo_wfl/wfl_t/wfr/wfr_t/wrl/wrl_t/wrr/wrr_t`.

**Отчёт:** `/driver-app/tech-inspections` — доступен всем у кого есть раздел Reports. Экспорт XLSX без фотографий.

## Пост-чекап (PostCheckup)

Данные в объекте `checkUpPostData`. Форма — 3 шага (post_pt1/post_pt2/post_pt3).

### Поля с нестандартной обработкой

| Поле | HTML-элемент | Тип | Логика |
|------|-------------|-----|--------|
| `antifreeze_ok` | `postCoolantSwitch` | msToggle | Необязательное. `true` если чекнуто, `false` иначе |
| `dashboard_errors` | `postPanelErrorSwitch` + `postPanelOkSwitch` | два msToggle | Взаимоисключающие: `true`/`false`/`null` |
| `osago_date` | `post_osago_date` | текст | Скрывается если `postOsagoMissingSwitch` включён |
| `wifi` | `post_wifi_switch` | segmented A/B/C/NONE | Отдельный блок от VPN |
| `vpn` | `post_vpn_switch` | segmented A/B/C/NONE | Отдельный блок от Wi-Fi |

### Валидация по шагам
- `validatePostPt1()` — 4 угловых фото, фото салона
- `validatePostPt2()` — масло, тормозная жидкость, омывайка, освещение, аварийный набор, стёкла (охлаждайка — необязательна)
- `validatePostPt3()` — топливо, панель приборов (один из двух свитчей), пробег, СТС, ОСАГО или `postOsagoMissingSwitch`, Wi-Fi, VPN

## Известные нюансы

- **Без пересборки для статики**: `docker cp` в живой контейнер работает мгновенно для `.js`/`.html`.
- **Синхронизация с проделом**: в июле 2026 продакшн опережал GitHub на ~60 коммитов — всё синхронизировано.
- **Старый кэш Safari**: если сайт раньше был другим — `Safari → Настройки → Конфиденциальность → Управление данными веб-сайтов → удалить motorsharks.online`.
- **Telegram SDK**: полностью удалён. Весь код работает через стандартные browser API.
- **SSH**: `ssh root@89.111.165.211` — ключ уже добавлен, пароль не нужен.
- **Минифицированный JS**: `app.js` — один файл, одна строка ~60KB. Никаких `//` комментариев в середине кода — они закомментируют всё до конца «строки» = до конца файла.
