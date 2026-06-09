FROM node:20-slim

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

EXPOSE 5173

# MVP:直接跑 Vite dev server(--host 讓容器外可連)
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
