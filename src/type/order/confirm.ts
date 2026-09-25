/**
 * 结算页数据。
 *
 * 对应后端 order 模块：
 *   GET /api/order/front/jwt/confirm      → OrderConfirm
 *   GET /api/order/front/jwt/fare?addrId= → FareResult
 */

import type { MemberAddress } from '@/type/member'

/**
 * 结算页里的一件商品。
 *
 * 后端是把购物车的 `CartItemVo` 塞进 order 的 `OrderItemVo` 发过来的，所以形状和
 * 购物车项基本一致；后端还会多带一个 `weight` 字段（OrderItemVo 自己的），结算页用不上，
 * 不声明它 —— TS 结构化类型不在乎多出来的字段。
 */
export interface CheckoutItem {
  skuId: number
  title: string
  image: string
  /** ⚠️ 可能为 null（该 sku 没有销售属性） */
  skuAttrValues: string[] | null
  price: number
  count: number
  /** 小计 = price × count，后端算好的 */
  totalPrice: number
}

export interface OrderConfirm {
  addresses: MemberAddress[]
  /** 默认地址 id；一个地址都没有时为 null */
  defaultAddrId: number | null
  items: CheckoutItem[]
  /** 会员积分。⚠️ 实测可能为 null（会员表里就是 null，没跑过积分逻辑） */
  integration: number | null
  /** 防重令牌。提交时原样回传；后端 30 分钟有效，且用掉一次就删 */
  orderToken: string
  /**
   * skuId -> 是否有货。
   *
   * ⚠️ JSON 的 key 是**字符串**（后端是 `Map<Long,Boolean>`，Jackson 会把 Long key 写成字符串），
   *    取值要写 `stocks[String(skuId)]`，别写 `stocks[skuId]`。
   */
  stocks: Record<string, boolean>
  /** 商品总额（不含运费） */
  totalAmount: number
  /** 默认收货地址对应的运费 */
  freightAmount: number
  /**
   * 应付总额 = totalAmount + freightAmount。
   *
   * ⚠️ 提交时要原样回传这个数（含运费）。只传商品总额的话后端会判"价格已变动"(17002)。
   */
  payAmount: number
  /** 商品总件数 */
  count: number
}

/**
 * 运费查询结果。
 *
 * 换收货地址时调它重算，然后把返回的 `fare` 当成新的运费。
 * 后端会校验地址归属，不是自己的地址返回 17004。
 */
export interface FareResult {
  address: MemberAddress
  fare: number
}
