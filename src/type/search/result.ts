/**
 * 检索结果。
 *
 * 对应后端 `search/vo/SearchResult.java`，即
 * `GET /api/search/front/list` 的 `data`。
 */

import type { SkuSummary } from '../product/sku'
import type { AttrFacet, BrandFacet, CatalogFacet, FilterChip } from './facet'

/** 分页信息。后端把它和商品列表放在同一层，不是嵌套对象 */
export interface SearchPage {
  /** 当前页码，从 1 开始 */
  pageNum: number
  /** 命中的总条数 */
  total: number
  /** 总页数，按实际 pageSize 计算 */
  totalPages: number
}

/**
 * 检索结果。
 *
 * 后端**不返回** `pageNavs`（页码范围）了，分页控件要自己按
 * `pageNum` / `totalPages` 算要显示哪几个页码。
 */
export interface SearchResult extends SearchPage {
  /** 当前页的商品 */
  product: SkuSummary[]
  /** 品牌候选 */
  brands: BrandFacet[]
  /** 属性候选 */
  attrs: AttrFacet[]
  /** 分类候选 */
  catalogs: CatalogFacet[]
  /** 已选筛选条件，用来渲染 chips */
  navs: FilterChip[]
  /** 当前已选中的属性 id，用来回显属性分组的勾选状态 */
  attrIds: number[]
}
