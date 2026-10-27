
FROM node:22-alpine

ARG GIT_COMMIT_SHA=unknown

ENV NODE_ENV=production
ENV PORT=3000
ENV GIT_COMMIT_SHA=${GIT_COMMIT_SHA}

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --chown=node:node server.js ./
COPY --chown=node:node public/ ./public/

RUN chown -R node:node /app

USER node

EXPOSE 3000

CMD ["npm", "start"]
