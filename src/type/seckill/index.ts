/**
 * 秒杀。
 *
 * 对应后端 seckill 服务的两个前台接口：
 *   GET  /api/seckill/front/current     → CurrentSeckill[]
 *   POST /api/seckill/front/jwt/kill    → 秒杀订单号
 *
 * 和 `@/type/product` 里那个 `SeckillSku` 的分工：
 *   SeckillSku      随商品详情一起返回，只有秒杀本身的信息（详情页用它决定显不显示抢购按钮）
 *   CurrentSeckill  秒杀列表用的，多一段 skuInfo（标题、图片、原价），好直接渲染成卡片
 */

import type { SeckillSku } from '@/type/product'

/** 秒杀条目里附带的 sku 基本信息，对应后端 `seckill/vo/SkuInfoVo.java` */
export interface SeckillSkuInfo {
  skuId: number
  spuId: number
  skuName: string | null
  skuDesc: string | null
  catalogId: number
  brandId: number
  /** 列表卡片用的主图 */
  skuDefaultImg: string
  skuTitle: string
  skuSubtitle: string | null
  /** 原价。和 seckillPrice 一起显示成"现价 + 划线原价" */
  price: number
  saleCount: number | null
}

/** `GET /seckill/front/current` 返回数组里的一项 */
export interface CurrentSeckill extends SeckillSku {
  /**
   * sku 基本信息。
   *
   * ⚠️ 可能是 null：后端上架秒杀场次时是按 skuId 反查商品服务的，那一步失败
   *    （商品被删、商品服务抖动）也会把这条照写进 Redis，只是 skuInfo 为空。
   *    所以渲染卡片前必须判空，不能直接 `item.skuInfo.skuTitle`。
   */
  skuInfo: SeckillSkuInfo | null
}
