FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g corepack@latest && corepack enable

FROM base AS build
COPY . /app
WORKDIR /app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run build

FROM nginx:stable-alpine
# 安装htpasswd工具和dos2unix
RUN apk add --no-cache apache2-utils dos2unix

# 复制Nginx配置
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# 复制Web应用
COPY --from=build /app/packages/web/dist /usr/share/nginx/html

# 复制并设置启动脚本
COPY docker/generate-config.sh /docker-entrypoint.d/40-generate-config.sh
COPY docker/generate-auth.sh /docker-entrypoint.d/30-generate-auth.sh

# 确保脚本有执行权限
RUN chmod +x /docker-entrypoint.d/40-generate-config.sh
RUN chmod +x /docker-entrypoint.d/30-generate-auth.sh

# 转换可能的Windows行尾符为Unix格式
RUN dos2unix /docker-entrypoint.d/40-generate-config.sh
RUN dos2unix /docker-entrypoint.d/30-generate-auth.sh

EXPOSE 80