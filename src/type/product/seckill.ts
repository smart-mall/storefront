/**
 * 秒杀信息。
 *
 * 对应后端 `product/vo/SeckillSkuVo.java`，随商品详情一起返回
 * （`SkuDetail.seckillSkuVo`），不需要单独请求。
 */
export interface SeckillSku {
  /** 秒杀活动 id */
  promotionId: number
  /** 活动场次 id */
  promotionSessionId: number
  skuId: number
  /** 秒杀价，展示时要和原价对比出折扣 */
  seckillPrice: number
  /** 秒杀总量 */
  seckillCount: number
  /** 每人限购数量 */
  seckillLimit: number
  /** 排序 */
  seckillSort: number | null
  /** 秒杀开始时间，毫秒时间戳 */
  startTime: number
  /** 秒杀结束时间，毫秒时间戳 */
  endTime: number
  /** 秒杀随机码，下单时后端会校验，前端不用理解含义 */
  randomCode: string
}
