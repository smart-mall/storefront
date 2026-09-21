/**
 * 销售属性与规格参数。
 *
 * 都是商品详情 `SkuDetail` 的组成部分，对应后端：
 *   `product/vo/SkuItemSaleAttrVo.java`、`AttrValueWithSkuIdVo.java`、
 *   `SpuItemAttrGroupVo.java`、`Attr.java`
 */

/** 规格参数里的一个属性，对应后端 `product/vo/Attr.java` */
export interface SpuAttr {
  attrId: number
  attrName: string
  /** 属性值，单值字符串（一个属性有多个值时用 `;` 连接） */
  attrValue: string
}

/** 一组规格参数，详情页按 groupName 分块渲染（如"主体"、"屏幕"） */
export interface SpuAttrGroup {
  groupName: string
  attrs: SpuAttr[]
}

/** 销售属性的一个可选值，附带拥有该值的 skuId */
export interface SaleAttrValue {
  attrValue: string
  /**
   * 拥有该属性值的 skuId 列表。
   *
   * ⚠️ 后端是 `group_concat(DISTINCT sku_id)` 出来的**字符串**（形如 `"1,2,3"`），
   *    不是数组。点选规格去匹配 SKU 时要自己 `split(',')`。
   */
  skuIds: string
}

/**
 * 一组销售属性（颜色、套餐…）。
 *
 * 详情页点选规格的实现方式：每个 SaleAttr 选一个值，把所有选中值对应的 skuIds
 * 取交集，命中的那个 skuId 就是当前应该展示的 SKU。
 */
export interface SaleAttr {
  attrId: number
  attrName: string
  attrValues: SaleAttrValue[]
}
