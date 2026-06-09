FROM node:22-slim

WORKDIR /app

# 啟用 corepack,依 package.json 的 packageManager 鎖定精確 pnpm 版本(可重現)
RUN corepack enable

# 先複製鎖定檔以善用 Docker 快取
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 5173

# MVP:直接跑 Vite dev server(--host 讓容器外可連)
CMD ["pnpm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
