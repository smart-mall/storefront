/**
 * 商品图片与图文介绍。
 *
 * 对应后端 `product/entity/SkuImagesEntity.java`（pms_sku_images）和
 * `SpuInfoDescEntity.java`（pms_spu_info_desc），都是商品详情 `SkuDetail` 的组成部分。
 */

/** SKU 图片，对应 pms_sku_images */
export interface SkuImage {
  id: number
  skuId: number
  /** 图片地址 */
  imgUrl: string
  /** 排序。后端不保证顺序，前端展示前要按它升序排 */
  imgSort: number | null
  /** 是否默认图：1 = 主图，0 = 非默认 */
  defaultImg: number | null
}

/** SPU 图文介绍，对应 pms_spu_info_desc */
export interface SpuDescription {
  spuId: number
  /**
   * 商品介绍。
   *
   * ⚠️ 字段名就是 `decript`（少一个 s），建表时就写错了，后端实体跟着表走，
   *    前端必须照抄这个拼写，写成 description 拿到的是 undefined。
   *
   * ⚠️ 内容不是富文本，是**逗号分隔的图片地址**，渲染时要自己 split(',')。
   */
  decript: string | null
}
