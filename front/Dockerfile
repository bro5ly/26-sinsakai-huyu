# APIと同じNode・npmの版にそろえる。ロックファイルが1つなので、違う版のnpmだと毎回書き換わる(2026-10-24 P4)
FROM node:24-bookworm-slim
WORKDIR /app

# workspacesのロックファイルは直下に1つ。npm ciはすべてのワークスペースのpackage.jsonを見るので、3つとも写す(2026-10-24 P3)
COPY package.json package-lock.json ./
COPY back/package.json back/
COPY front/package.json front/
COPY shared/package.json shared/
RUN npm ci -w front -w shared

COPY shared shared/
COPY front front/
WORKDIR /app/front
EXPOSE 4545

CMD [ "npm","run","dev" ]
