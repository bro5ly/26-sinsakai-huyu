FROM node:24-bookworm-slim
WORKDIR /app

# workspacesのロックファイルは直下に1つ。npm ciはすべてのワークスペースのpackage.jsonを見るので、3つとも写す(2026-10-24 P3)
COPY package.json package-lock.json ./
COPY back/package.json back/
COPY front/package.json front/
COPY shared/package.json shared/
RUN npm ci -w back -w shared

COPY back/prisma back/prisma/
WORKDIR /app/back
RUN npx prisma generate

WORKDIR /app
COPY shared shared/
COPY back back/
WORKDIR /app/back
EXPOSE 5454

CMD [ "npm","run","dev" ]
