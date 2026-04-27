# motorsharks — Linux Docker deploy

Этот репозиторий **готов к сборке и запуску на Linux в Docker** через `ServerLinux/` (ASP.NET Core, .NET 8).

## Быстрый старт (Linux/Docker)

В корне репозитория:

```bash
docker compose up --build -d
```

Откроется:
- `http://<host>:8080/test`
- `http://<host>:8080/driver-app/`

## Данные и персистентность

Контейнер пишет данные в каталог, заданный переменной **`MOTORSHARKS_DATA_DIR`** (в `docker-compose.yml` это `/app/data`).

По умолчанию `docker-compose.yml` монтирует volume:
- `./data:/app/data`

В итоге на хосте сохраняются:
- `data/users.xlsx`, `data/cars.xlsx`, `data/checkups.xlsx`, `data/post_checkups.xlsx`, `data/random.xlsx`
- `data/Photo/...` (фотографии)

## Переменные окружения

- **`ASPNETCORE_URLS`**: на каких адресах слушать (пример: `http://0.0.0.0:8080`)
- **`MOTORSHARKS_DATA_DIR`**: куда сохранять xlsx/фото (пример: `/app/data`)

## Synology DSM (Container Manager)

Рекомендованный путь — поднять проект как “Compose project”.

1) Установи пакет **Container Manager**
2) Скопируй на NAS папку проекта (или хотя бы файлы):
   - `ServerLinux/`
   - `Client/`
   - `docker-compose.yml`
3) В `docker-compose.yml` замени volume на shared folder, например:

```yaml
volumes:
  - /volume1/motorsharks/data:/app/data
```

4) Запусти проект, проверь:
   - `/test`
   - `/driver-app/`

## Сборка без Docker (на Linux)

```bash
dotnet publish ServerLinux/Motorsharks.ServerLinux.csproj -c Release -o out
./out/Motorsharks.ServerLinux --urls http://0.0.0.0:8080
```



