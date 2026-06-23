FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm install

FROM base AS builder
WORKDIR /app
ARG NEXT_PUBLIC_BASE_PATH=""
ENV NEXT_PUBLIC_BASE_PATH=$NEXT_PUBLIC_BASE_PATH
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ARG NEXT_PUBLIC_BASE_PATH=""
ENV NEXT_PUBLIC_BASE_PATH=$NEXT_PUBLIC_BASE_PATH
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "server.js"]
