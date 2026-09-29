/**
 * 结算页数据。
 *
 * 对应后端 order 模块：
 *   GET /api/order/front/jwt/confirm?couponHistoryId=      → OrderConfirm
 *   GET /api/order/front/jwt/fare?addrId=&couponHistoryId= → FareResult
 *
 * 两个接口返回的是**同一组金额字段**，结算页把它们当同一个形状的两个来源：
 * 初次加载用 `/confirm`，之后任一影响价格的参数变了就用 `/fare` 重算并覆盖。
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
  /** 选中优惠券的抵扣额；没选券时为 0 */
  couponAmount: number
  /**
   * 应付总额 = totalAmount + freightAmount − couponAmount。
   *
   * ⚠️ 提交时要原样回传这个数（含运费、已减券）。只传商品总额的话后端会判"价格已变动"(17002)。
   */
  payAmount: number
  /** 当前选中的领取记录 ID；没选券时为 null */
  couponHistoryId: number | null
  /**
   * 当前购物车可用的券，后端按抵扣额从大到小排好。
   *
   * ⚠️ 每张券都带自己的 `discountAmount`，切券时可以直接预览价格；但真正提交用的
   *    `payAmount` 仍以重新请求本接口拿到的为准 —— 别拿券面金额自己减。
   */
  availableCoupons: CouponUsable[]
  /**
   * 每个商品的运费明细，与 `items` 按 `skuId` 对应，供清单逐行显示。
   *
   * ⚠️ 不要拿它自己求和当总运费：总运费用上面的 `freightAmount`，
   *    两边舍入方式一旦不同就会差几分钱。
   */
  fareItems: FareItem[]
  /**
   * 每个商品的优惠明细，与 `items` 按 `skuId` 对应。
   *
   * ⚠️ 行数不一定和 `fareItems` 一样：运费覆盖全部商品，优惠只覆盖券适用范围内的那些，
   *    范围外的商品不会出现在这里。按 `skuId` 查，不要按下标对齐。
   */
  couponItems: CouponItem[]
  /** 商品总件数 */
  count: number
}

/** 单个商品的运费明细。 */
export interface FareItem {
  skuId: number
  fare: number
}

/** 单个商品的优惠明细。 */
export interface CouponItem {
  skuId: number
  /** 该商品分到的抵扣额 */
  discountAmount: number
}

/**
 * 结算页可用的一张券。
 *
 * 对应后端 `common/to/CouponUsableVo`，两个金额是配对的：
 * `scopeAmount` 是券适用范围内的商品金额（门槛比的就是它），`discountAmount` 是实际抵扣额
 * （券面金额与 `scopeAmount` 中的较小者）。**不要拿 `amount` 自己去减** ——
 * 范围外商品占多数时会减多。
 */
export interface CouponUsable {
  /** 领取记录 ID。提交订单时回传它来指定用哪张券 */
  couponHistoryId: number
  couponId: number
  couponName: string
  /** 券面金额 */
  amount: number
  /** 使用门槛 */
  minPoint: number
  /** 可使用结束时间 */
  couponEndTime: string
  /** 券适用范围内的商品金额 */
  scopeAmount: number
  /** 本单实际抵扣金额 */
  discountAmount: number
  /**
   * 抵扣额覆盖的 SKU。
   *
   * 全场券就是购物车里的全部 SKU；指定范围的券只含命中的那些。
   * 前端只用它判断"这张券能不能用在这车商品上"，不拿它算钱。
   */
  scopeSkuIds: number[]
}

/**
 * 结算金额重算结果。
 *
 * ⚠️ 这不是"只算运费"：**任何影响价格的参数变了都要重算** —— 换收货地址、换券，
 *    带上当前选中的 `couponHistoryId` 再调一次，否则应付金额会退回原价，
 *    提交时被判成 17002。商品清单由后端按购物车自己取，前端不传。
 *    四个金额都由后端算定，前端不要自己按「商品总额 + 运费 − 优惠」重算。
 *    后端会校验地址归属，不是自己的地址返回 17004。
 */
export interface FareResult {
  /** 商品总额，不含运费 */
  totalAmount: number
  /** 整单运费 */
  freightAmount: number
  /** 优惠金额；没用券时为 0 */
  couponAmount: number
  /** 应付总额 = totalAmount + freightAmount − couponAmount */
  payAmount: number
  /** 每个商品的运费明细 */
  fareItems: FareItem[]
  /** 每个商品的优惠明细；没用券时为空数组 */
  couponItems: CouponItem[]
}
