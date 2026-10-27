
FROM node:22-alpine

ARG GIT_COMMIT_SHA=unknown

ENV NODE_ENV=production
ENV PORT=3000
ENV GIT_COMMIT_SHA=${GIT_COMMIT_SHA}

WORKDIR /app

COPY --chown=node:node package.json server.js ./
COPY --chown=node:node public/ ./public/

USER node

EXPOSE 3000

CMD ["npm", "start"]
