# GrainMall · 用户端

谷粒商城的用户购物界面：Vue 3 + Vite + TypeScript，打包成 nginx 静态镜像，由后端仓库的 compose 发布在 56732。

## 启动

需要 Node 20.19+ 或 22.12+。

```bash
npm install
npm run dev        # http://localhost:5173
```

接口地址写死在 `src/tools/request.ts` 的 `baseURL`（`http://localhost:53000/api`），换环境只改这一处。生产构建用 `npm run build`（先 `vue-tsc` 类型检查再 `vite build`）。

## 构建镜像

```bash
docker build -t grain-mall-user:latest .
```

## 部署

在后端仓库执行：

```bash
docker compose -f gl-com.yml up -d gl-user-front
```
