/**
 * 商品三级分类。
 *
 * 对应后端 `product/vo/CategoryVo.java`，接口 `GET /api/product/front/catalog`。
 *
 * 三个层级复用同一个接口：一级分类的 children 是二级，二级的 children 是三级，
 * 三级的 children 是空数组。后端已经按 sort 排好序，前端不要再排一次。
 */
export interface CategoryNode {
  /** 分类 id，检索时作为 catalog3Id 传 */
  catId: number
  /** 分类名称 */
  name: string
  /**
   * Element UI 图标类名（如 `el-icon-goods`），**不是 URL**。
   *
   * 用途是后台分类树的三个层级渲染，这个接口只是把它透传出来，SPA 目前不显示它。
   * 仍然留在类型里是因为后端 `CategoryVo` 确实返回它，删掉会和响应体对不上。
   */
  icon: string | null
  /** 子分类，三级分类为空数组 */
  children: CategoryNode[]
}
