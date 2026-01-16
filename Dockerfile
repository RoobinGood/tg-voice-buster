FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json npm-shrinkwrap.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build
RUN npm prune --omit=dev

FROM node:20-alpine

WORKDIR /app
RUN apk add --no-cache ffmpeg

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
