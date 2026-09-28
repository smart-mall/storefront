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
  /** 图片名，取上传时的原始文件名；历史数据可能为 null */
  imgName?: string | null
  /** 图片地址 */
  imgUrl: string
  /** 排序。由后台拖拽图集时排定，前端展示前仍要按它升序排 */
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
   * ⚠️ 内容不是富文本，是**逗号分隔的图片地址**，渲染时要自己 split(',')。
   */
  description: string | null
}
