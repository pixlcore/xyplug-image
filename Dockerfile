FROM node:24-trixie-slim

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
	  procps \
	  lsof \
      libcairo2 \
      libexpat1 \
      libpango-1.0-0 \
      libpangocairo-1.0-0 \
      libjpeg62-turbo \
      libgif7 \
      librsvg2-2 \
      iproute2 && \
    rm -rf /var/lib/apt/lists/*

COPY package.json ./
COPY index.js ./

RUN npm install --omit=dev
RUN npm install -g @pixlcore/xyrun

CMD ["xyrun", "node", "index.js"]
