/**
 * ESLint 扁平配置（Flat Config）
 * ================================
 *
 * 几个前提，否则看不懂这个文件：
 *
 * 1. ESLint 9 起废弃了 .eslintrc.* 系列文件，改为只认 eslint.config.* 这一个文件。
 * 2. 这个文件导出的是一个「配置对象数组」，数组里靠后的对象会覆盖靠前对象的同名规则。
 *    => 所以顺序就是优先级，最关键的「关掉格式化规则」必须放最后。
 * 3. 它是个 TypeScript 文件，ESLint 自己不会读 TS，靠 jiti 这个包加载（已装在 devDependencies）。
 * 4. 本文件同时被 tsconfig.node.json 纳入类型检查（否则类型感知规则会报
 *    "was not found by the project service"）。
 */
import { globalIgnores } from 'eslint/config'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

export default defineConfigWithVueTs(
  // ① 声明要检查哪些文件。
  //    不写这一条的话，ESLint 会按扩展名去猜，容易漏掉 .vue 文件。
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,tsx,vue}'],
  },

  // ② 全局忽略目录。等价于旧版的 .eslintignore（那个文件在扁平配置里已废弃）。
  //    这里列的目录一律不检查。
  globalIgnores(['**/dist/**', '**/dist-ssr/**', '**/coverage/**', '**/node_modules/**']),

  // ③ Vue 官方推荐规则集。管的是模板语法、指令用法、组件写法上的常见错误。
  //    例如：v-for 忘了写 key、v-if 和 v-for 混用、模板里用了未定义的变量等。
  pluginVue.configs['flat/recommended'],

  // ④ TypeScript 官方推荐规则集，包含「类型感知」规则。
  //    它真的会去读你的类型，所以能查出让普通 lint 查不出来的问题：
  //    比如 await 了一个非 Promise、把 void 当值用、Promise 没被 await 等。
  vueTsConfigs.recommended,

  // ⑤ 项目自己的规则。放在两套官方规则集之后，所以能覆盖它们。
  {
    name: 'app/rules',
    rules: {
      /* ==================== 通用 JavaScript 规则 ==================== */

      // 禁止把 console.log 留在代码里；但放行 console.warn / console.error
      // （这两个在调试和错误上报时是必要的）
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // 禁止 debugger 断点提交到仓库
      'no-debugger': 'warn',

      // 禁止 var。var 有变量提升和函数作用域问题，一律用 let / const
      'no-var': 'error',

      // 变量如果从不重新赋值，就必须声明成 const（能减少误改）
      'prefer-const': 'error',

      // 强制用 === / !==，避免 '1' == 1 这种隐式类型转换的坑。
      // { null: 'ignore' } 是特例：允许 x == null，因为它同时判 null 和 undefined，
      // 这是 JS 里唯一被广泛认可的 == 用法
      eqeqeq: ['error', 'always', { null: 'ignore' }],

      // 对象字面量属性简写：{ name: name } 要写成 { name }
      'object-shorthand': 'warn',

      /* ==================== Vue 专属规则 ==================== */

      // 组件名必须是「多个单词」。
      // 原因：<Header> 这类单词名会和原生 HTML 标签 <header> 冲突，Vue 无法区分。
      // App、index 是官方约定俗成的例外，所以放行。
      'vue/multi-word-component-names': ['error', { ignores: ['App', 'index'] }],

      // 模板里写了 ref="xxx"，但 script 里没有同名变量时报警。
      // 这是「模板引用写错名字」最常见的低级错误来源。
      'vue/no-unused-refs': 'error',

      // <div :id="'a'"> 这种「绑定了一个固定值」的写法没有意义，应直接写 id="a"
      'vue/no-useless-v-bind': 'error',

      // <Comp :disabled="true"> 简写成 <Comp disabled>
      'vue/prefer-true-attribute-shorthand': 'warn',

      // 强制 SFC 里三个块的顺序：template -> script -> style。
      // 目的：全项目所有组件长得一样，翻文件时不用找 script 在哪。
      'vue/block-order': ['error', { order: ['template', 'script', 'style'] }],

      // <script setup> 里编译宏的书写顺序。
      // 固定成 defineOptions -> defineProps -> defineEmits -> defineSlots，
      // 读组件时先看「对外收什么」，再看「往外发什么」
      'vue/define-macros-order': [
        'error',
        { order: ['defineOptions', 'defineProps', 'defineEmits', 'defineSlots'] },
      ],

      /* ==================== TypeScript 规则 ==================== */

      // 尽量别写 any。设为 warn 而不是 error，因为调用第三方库、处理动态 JSON
      // 时确实有推断不出来的地方，一刀切禁止会逼人到处写 eslint-disable
      '@typescript-eslint/no-explicit-any': 'warn',

      // 未使用的变量 / 参数报警。
      // 以 _ 开头的名字视为「我是故意不用的」，放行
      // （例如解构时只想取后面几项：const { a: _a, ...rest } = obj）
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],

      // 只当类型用的导入必须写成 import type { X } from '...'。
      // 配合 tsconfig 里的 verbatimModuleSyntax，这些导入会在打包时被彻底删掉，
      // 不会因为「导入了但只用了类型」而把整个模块拖进包里
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],

      // 禁止 import type { A } from 'x' 这种「只导入类型却产生副作用」的写法
      '@typescript-eslint/no-import-type-side-effects': 'error',
    },
  },

  // ⑥ 必须放在最后！
  //    @vue/eslint-config-prettier/skip-formatting 会关掉 ESLint 里所有
  //    「和 Prettier 抢活干」的排版类规则（缩进、分号、引号、换行等）。
  //    这样分工才清晰：排版听 Prettier 的，代码质量听 ESLint 的，两边不会互相改。
  skipFormatting,
)
