/**
 * 筛选候选与已选条件。
 *
 * 对应后端 `search/vo/SearchResult.java` 里的四个内嵌 VO：
 * `BrandVo` / `AttrVo` / `CatalogVo` / `NavVo`。
 *
 * 这三组候选都是 ES 聚合（facet）的结果，随检索接口一起返回，
 * 不需要额外请求。后端做过处理：**候选不会被自己的筛选条件收窄** ——
 * 勾了"华为"之后品牌候选里另外几个品牌仍然在，用户改得了选择。
 */

/** 品牌候选，对应 `SearchResult.BrandVo` */
export interface BrandFacet {
  brandId: number
  brandName: string
  brandImg: string
}

/**
 * 属性候选，对应 `SearchResult.AttrVo`。
 *
 * ⚠️ 和 `SkuAttr` 的区别在 attrValue：这里是聚合出来的候选值**数组**，
 *    `SkuAttr.attrValue` 是单值字符串。
 */
export interface AttrFacet {
  attrId: number
  attrName: string
  /** 该属性在当前结果集里出现过的所有值 */
  attrValue: string[]
}

/** 分类候选，对应 `SearchResult.CatalogVo` */
export interface CatalogFacet {
  catalogId: number
  catalogName: string
}

/**
 * 已选条件里要移除的参数名。
 *
 * `keyword` 不在后端返回的 `navs` 里（后端只拼分类/品牌/属性三种），
 * 是前端自己补的一条 —— 关键词没有复选框可以回显，不放进 chips 用户就
 * 既看不到当前搜的是什么、也没地方一键清掉。
 */
export type ChipKey = 'keyword' | 'brandId' | 'catalog3Id' | 'attrs'

/**
 * 一条已选筛选条件，对应 `SearchResult.NavVo`。
 *
 * 前端点 ✕ 时：从自己的查询条件里删掉 `removeKey` 中等于 `removeValue` 的那一项，
 * 然后重新请求。后端只告诉"移除什么"，不拼 URL。
 *
 * ⚠️ `navValue` 只是**展示用**，不要拿它反解参数。当已选项不在候选集里时
 *    （比如选了荣耀、但当前分类下只有乐高），后端取不到名字会退化成显示 id，
 *    出现 `navValue: "1"` 这种情况。前端展示时应优先用自己手里的名称。
 */
export interface FilterChip {
  /** 展示名，如"品牌"、"电池容量"、"分类" */
  navName: string
  /** 展示值；同属性多值用顿号连接（后端已把协议里的冒号换成顿号） */
  navValue: string
  /** 从哪个参数里移除 */
  removeKey: ChipKey
  /** 移除哪个值，原样返回（如 `"1"`、`"9_4000mAh:3500mAh"`） */
  removeValue: string
}
