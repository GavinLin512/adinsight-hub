# Docker Compose 部署與重建

> adinsight-hub 用 `docker-compose.yml` 編排:`db`(postgres,pull image)、`backend`(`build: ./backend`)、`frontend`(`build: ./frontend`)。
> `frontend` 與 `backend` 都是 `build:` 出來的映像,改了原始碼必須 `--build` 才會進映像。

## 全部重新 build 並啟動

```bash
docker compose up --build
```

`--build` 會在啟動前重新 build 所有有 `build:` 的服務(frontend + backend);db 是 pull image 不受影響。

## 只重新 build 某一方

指定服務名稱即可:

```bash
# 只重 build backend(會一併帶起它依賴的 db)
docker compose up --build backend

# 只重 build frontend(會一併帶起 backend、db)
docker compose up --build frontend
```

## 確保不吃舊快取(改了 Dockerfile/相依卻沒生效時)

```bash
# 完全不用 layer 快取重 build
docker compose build --no-cache frontend
docker compose up frontend
```

## 常用建議

- 日常改 code 後:`docker compose up --build` 最直覺。
- 想背景跑:加 `-d` → `docker compose up --build -d`。
- 只重啟不重 build(沒改 Dockerfile,例如只想重啟容器):`docker compose restart backend`。
- `--build` 是「重建映像」,不是「拉新 code 進現有容器」。單純 `docker compose up`(無 `--build`)會沿用舊映像 → 改的 code 不會生效。
