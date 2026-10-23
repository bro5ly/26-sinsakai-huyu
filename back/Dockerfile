FROM node:24-bookworm-slim
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY prisma ./prisma/
RUN npx prisma generate

COPY . .
EXPOSE 5454

CMD [ "npm","run","dev" ]