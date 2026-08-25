FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-pip \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY analysis/requirements.txt ./analysis/requirements.txt
RUN pip3 install --break-system-packages -r analysis/requirements.txt

COPY . .

ENV NODE_ENV=production
ENV PYTHON_BIN=python3
ENV UPLOAD_DIR=uploads

EXPOSE 10000

CMD ["node", "src/server.js"]
