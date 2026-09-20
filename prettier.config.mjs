/**
 * Prettier 格式化配置
 * ===================
 *
 * 为什么用 .mjs 而不是 .prettierrc.json？
 * 因为标准 JSON 不允许写注释，而这份配置的每一项都需要解释。
 * Prettier 3 原生支持 ESM 配置文件。
 *
 * 分工说明：
 * ESLint 那边用 @vue/eslint-config-prettier/skip-formatting 关掉了所有排版类规则，
 * 所以「代码长什么样」只由这一个文件决定。
 */

/** @type {import('prettier').Config} */
export default {
  // 每行最大宽度，超过就换行。
  // 100 是个折中值：默认 80 太窄（稍微嵌套深一点就折行），120 在分屏时又太长
  printWidth: 100,

  // 行尾不加分号。JS 的 ASI（自动分号插入）对现代代码足够可靠，
  // 少一个字符，视觉上也更干净
  semi: false,

  // 字符串优先用单引号。JS/TS 里单引号更常见，也少按一次 Shift
  // （JSX 属性里的引号会另按 html 规则处理，不受这条影响）
  singleQuote: true,

  // 多行对象 / 数组的最后一项后面也补一个逗号。
  // 好处：以后往末尾追加一项时，diff 只有一行新增，
  // 而不是「上一行加逗号 + 新增一行」两行变动
  trailingComma: 'all',

  // 箭头函数只有一个参数时也保留括号：(x) => x 而不是 x => x。
  // 这样以后加第二个参数时不用补括号，diff 更小
  arrowParens: 'always',

  // 换行符统一用 LF。
  // 必须和 .gitattributes（eol=lf）和 .editorconfig（end_of_line = lf）保持一致，
  // 三处不一致会导致「Prettier 改完 git 又改回来」的死循环
  endOfLine: 'lf',

  // Vue 模板里的空白敏感度按 CSS 处理。
  // 避免行内元素（<a>、<span>）之间的换行被渲染成多余空格
  htmlWhitespaceSensitivity: 'css',

  // .vue 文件里 <script> 和 <style> 的内容不再多缩进一层。
  // 关掉后 script 里的代码和 <script> 标签本身对齐，可读性更好
  vueIndentScriptAndStyle: false,
}
