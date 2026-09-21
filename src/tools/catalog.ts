/**
 * 分类树上的纯函数。
 *
 * 放在 `tools/` 而不是 `composables/`：这里没有响应式、也不发请求，
 * 是纯计算。分开的好处是能被 Node 直接跑起来验证 ——
 * `composables/` 下的文件都有 `@/` 运行期导入，Node 解析不了路径别名。
 */

import type { CategoryNode } from '@/type'

/**
 * 在分类树里找出某个分类的完整路径，从一级到它自己。
 *
 * 用途是商品详情页的面包屑：详情接口只给了 SKU 的 `catalogId`、没有分类名，
 * 而分类树是全局缓存的，直接查比再发一个请求划算。
 *
 * @returns 从一级到命中的那个节点的数组；找不到、或 catId 为 null 时返回空数组
 */
export function findCategoryPath(tree: CategoryNode[], catId: number | null): CategoryNode[] {
  if (catId === null) {
    return []
  }

  for (const node of tree) {
    if (node.catId === catId) {
      return [node]
    }

    // 命中在子树里，就把自己拼到路径最前面
    const childPath = findCategoryPath(node.children, catId)
    if (childPath.length > 0) {
      return [node, ...childPath]
    }
  }

  return []
}
