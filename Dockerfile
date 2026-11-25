# syntax=docker/dockerfile:1

# The build output is plain JavaScript, so build once on the runner's own CPU
# instead of once per target platform under emulation.
FROM --platform=$BUILDPLATFORM node:26-alpine AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Node 26 ships without Corepack, so install the pnpm that `packageManager` names.
RUN npm install -g "$(node -p "require('./package.json').packageManager")"
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# Nitro bundles the server and its dependencies into .output, so the runtime
# image needs nothing but Node.
FROM node:26-alpine
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000
COPY --from=build --chown=node:node /app/.output ./.output
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO /dev/null http://127.0.0.1:3000/setup/account || exit 1
CMD ["node", ".output/server/index.mjs"]
