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
  /**
   * 每个商品的运费明细，与 `items` 按 `skuId` 对应，供清单逐行显示。
   *
   * ⚠️ 不要拿它自己求和当总运费：总运费用上面的 `freightAmount`，
   *    两边舍入方式一旦不同就会差几分钱。
   */
  fareItems: FareItem[]
  /** 商品总件数 */
  count: number
}

/** 单个商品的运费明细。 */
export interface FareItem {
  skuId: number
  fare: number
}

/**
 * 运费查询结果。
 *
 * 换收货地址时调它重算。商品清单由后端按购物车自己取，前端不传；
 * 三个金额都由后端算定 —— 前端不要自己按「商品总额 + 运费」重算，
 * 加价规则一改就会与后端算出两个数，提交时被判成 17002。
 * 后端会校验地址归属，不是自己的地址返回 17004。
 */
export interface FareResult {
  /** 商品总额，不含运费 */
  totalAmount: number
  /** 整单运费 */
  freightAmount: number
  /** 应付总额 = totalAmount + freightAmount */
  payAmount: number
  /** 每个商品的运费明细 */
  fareItems: FareItem[]
}
