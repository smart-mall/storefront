// node:url 用来把「文件 URL」转成「跨平台的文件路径」。
// 不能直接用 import.meta.url，因为它在 Windows 下长这样：file:///D:/a/b
// 带着 file:// 前缀，而且斜杠方向和 Windows 的 \ 不一样，不能当路径用
import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Vue 单文件组件（.vue）的支持插件。
  // 没它的话 Vite 不认识 .vue 文件
  plugins: [vue()],

  resolve: {
    alias: {
      // 路径别名：把 @ 指向 src 目录。
      // 于是可以写 import request from '@/api/request'，
      // 而不用写 import request from '../../api/request'（层级一深就没法看）
      //
      // ⚠️ 必须和 tsconfig.app.json 里的 compilerOptions.paths 保持一致。
      //    那边负责「TS 编译/编辑器认识 @」，
      //    这边负责「Vite 打包时真的能找到文件」。
      //    只改一处会出现「编辑器不报错但打包失败」（或反过来）。
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
