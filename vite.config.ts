// node:url 用来把「文件 URL」转成「跨平台的文件路径」。
// 不能直接用 import.meta.url，因为它在 Windows 下长这样：file:///D:/a/b
// 带着 file:// 前缀，而且斜杠方向和 Windows 的 \ 不一样，不能当路径用
import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import ElementPlus from 'unplugin-element-plus/vite'
import { defineConfig } from 'vite'
import VueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // Vue 单文件组件（.vue）的支持插件。没它 Vite 不认识 .vue 文件
    vue(),

    // Element Plus 按需引入的样式注入。
    //
    // 本项目没用 unplugin-auto-import / unplugin-vue-components，组件一律显式导入：
    //   import { ElButton } from 'element-plus'
    // 这个插件的职责就是编译时给上面这行自动补一条对应组件的样式导入：
    //   import 'element-plus/es/components/button/style/css'
    // 也就是「用哪个组件就只打包哪个组件的样式」，不必全量引入 index.css。
    //
    // ⚠️ 必须有它。少了它，显式导入的组件就没有样式；
    //    ElMessage / ElMessageBox 这类函数式调用的样式也靠它补。
    ElementPlus({
      // 引编译好的 css，不引 scss 源码 —— 快。
      // 只有要做「SCSS 变量级」主题定制（改整套色阶）才改成 true，
      // 那时还要配 css.preprocessorOptions.scss.additionalData 指向自定义变量文件，
      // 代价是每次热更新都得重新编译 element-plus 的 scss，开发会明显变慢。
      // 只想改主色用 CSS 变量就够了：:root { --el-color-primary: #xxx; }
      useSource: false,
    }),

    // Vue DevTools：浏览器里看组件树、Pinia store、Router 路由、性能时间线。
    // 只在 dev 生效，build 时不会打进产物。
    VueDevTools(),
  ],

  resolve: {
    alias: {
      // 路径别名：把 @ 指向 src 目录。
      // 于是可以写 import { myAxios } from '@/tools/request'，
      // 而不用写 import { myAxios } from '../../tools/request'（层级一深就没法看）
      //
      // ⚠️ 必须和 tsconfig.app.json 里的 compilerOptions.paths 保持一致。
      //    那边负责「TS 编译 / 编辑器认识 @」，
      //    这边负责「Vite 打包时真的能找到文件」。
      //    只改一处会出现「编辑器不报错但打包失败」（或反过来）。
      //
      // 补充：Vite 8 新增了 resolve.tsconfigPaths 选项，设成 true 就直接读 tsconfig
      //      的 paths，能省掉这里的重复配置。本项目暂时保留手写 alias，
      //      因为它对 project references（tsconfig.json → tsconfig.app.json）
      //      的支持还没实测过，等验过再换。
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
