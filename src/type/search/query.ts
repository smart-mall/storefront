/**
 * 检索请求参数。
 *
 * 对应后端 `search/vo/SearchParam.java`，接口 `GET /api/search/front/list`。
 *
 * ⚠️ 参数名必须和后端完全一致，后端没有做任何名的映射。
 * ⚠️ `brandId` 和 `attrs` 是可重复的 query key（`brandId=1&brandId=2`），
 *    拼接方式见 `api/search.ts`，不要直接把数组丢给 axios 的默认序列化。
 */

/**
 * 排序条件：`<字段>_<asc|desc>`。
 *
 * 字段名必须是 `skuPrice` / `saleCount` / `hotScore` 之一，后端是拆开后
 * 直接当 ES 的排序字段用的；写错会返回 code=10001，不会静默忽略。
 * 用字面量联合而不是 string，就是为了让排序写错在编译期就被拦住。
 */
export type SearchSort =
  | 'skuPrice_asc'
  | 'skuPrice_desc'
  | 'saleCount_asc'
  | 'saleCount_desc'
  | 'hotScore_asc'
  | 'hotScore_desc'

/** 只看有货：1 = 只看有货，0 = 不限 */
export type StockFilter = 0 | 1

export interface SearchQuery {
  /** 全文检索关键字，会做高亮 */
  keyword?: string
  /** 三级分类 id，对应分类树第三级的 catId */
  catalog3Id?: number
  /** 品牌，可多选 */
  brandId?: number[]
  /**
   * 属性筛选，可多选，每项格式为 `属性id_属性值`。
   *
   * 同一属性的多个值用 `:` 连接（`"9_4000mAh:3500mAh"`，是 OR 关系）；
   * 不同属性之间是 AND 关系。
   */
  attrs?: string[]
  /**
   * 价格区间，三种写法：
   *   `"1000_2000"` 区间
   *   `"_2000"`     只要上限
   *   `"1000_"`     只要下限
   * 格式不对会返回 code=10001。
   */
  skuPrice?: string
  /** 只看有货 */
  hasStock?: StockFilter
  /** 排序 */
  sort?: SearchSort
  /** 页码，从 1 开始，不传后端按 1 */
  pageNum?: number
  /** 每页条数，1~100，不传后端按 20 */
  pageSize?: number
}
