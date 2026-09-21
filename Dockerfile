# gl-user-vue —— 商城用户端 SPA（user-vue 仓库）
#
# 构建（在 user-vue 仓库根目录执行，构建上下文 = 本仓库根）：
#   docker build -t grain-mall-user:latest .
#
# 参照同级目录的 grain-mall-front-end/Dockerfile（后台管理前端）：
# 同样是「node 构建 → nginx 托管」两阶段。与它不同的地方有两处，都是 SPA 必须的：
#   1. 自带 nginx.conf，给 vue-router 的 history 模式做 index.html 回落；
#   2. 构建期设 HUSKY=0，绕开 npm ci 会触发的 husky prepare（容器里没有 .git）。

# ===================== 构建阶段 =====================
# Vite 8 要求 Node ^20.19 || >=22.12，这里与本地开发用的 24 保持一致。
# 选 bookworm-slim（glibc）而不是 alpine：devDependencies 里有 sass-embedded 这个原生依赖，
# 当前没有任何 .scss/.sass 文件用到它，但 glibc 不会引入 musl 的意外。
FROM node:24-bookworm-slim AS build

WORKDIR /build

# HUSKY=0 是 husky 官方的关闭开关。
# package.json 的 prepare 脚本是 "husky"，npm ci 会执行它，而 .dockerignore 排除了 .git，
# husky 在没有 .git 的目录里会报 ".git can't be found"。
# ⚠️ 不能改用 --ignore-scripts：vite / rolldown 的原生二进制靠 postinstall 安装，
#    一起跳过会让后面的 npm run build 找不到二进制。
ENV HUSKY=0

# 先只复制依赖清单，让这一层可以被缓存 —— 之后改业务代码不会让 npm ci 重跑
COPY package.json package-lock.json ./
RUN npm ci

# 再复制源码。.dockerignore 已排除 node_modules 和 dist，不会把本机的产物覆盖进去
COPY . .

# package.json 的 build 是 "vue-tsc -b && vite build"：先类型检查再打包。
# 所以镜像构建顺带就是一次类型门禁 —— 类型不过，镜像根本出不来
RUN npm run build

# ===================== 运行阶段 =====================
FROM nginx:alpine

# 覆盖镜像自带的 default.conf。重点在 location / 的 try_files 回落，原因见 nginx.conf 注释
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /build/dist /usr/share/nginx/html

EXPOSE 80
