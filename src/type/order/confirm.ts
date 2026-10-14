/**
 * 结算页数据。
 *
 * 对应后端 order 模块：
 *   GET /api/order/front/jwt/confirm?couponHistoryId=&useIntegration=      → OrderConfirm
 *   GET /api/order/front/jwt/fare?addrId=&couponHistoryId=&useIntegration= → FareResult
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
  /**
   * 会员当前的积分余额；后端已按 0 归一，不会为 null。
   *
   * ⚠️ 它取自会员服务，不是登录凭证里那份 —— 凭证里的积分是登录那一刻的快照，
   *    下过单之后就不准了，所以刷新结算页一定能拿到最新余额。
   */
  integration: number
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
  /** 商品促销减免额；没有命中满减或阶梯价时为 0 */
  promotionAmount: number
  /** 选中优惠券的抵扣额；没选券时为 0 */
  couponAmount: number
  /** 积分抵扣额；没用积分时为 0 */
  integrationAmount: number
  /**
   * 应付总额 = totalAmount + freightAmount − promotionAmount − couponAmount − integrationAmount。
   *
   * ⚠️ 提交时要原样回传这个数（含运费、已减促销/券/积分）。只传商品总额的话后端会判"价格已变动"(17002)。
   */
  payAmount: number
  /**
   * 本单最多可用的积分数：封顶上限与余额取小。
   *
   * ⚠️ 为 0 表示本单用不了积分（封顶算下来不足 1 分，或余额为 0），这时整栏不显示。
   *    封顶按"商品总额减促销减免再减券抵扣"算，所以**换券之后这个数会变小** —— 换券后要用
   *    `/fare` 返回的新上限，别拿这里的旧值去限定输入范围。
   */
  integrationLimit: number
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
   * 每个商品的促销减免明细，与 `items` 按 `skuId` 对应。
   *
   * ⚠️ 只含命中满减或阶梯价的商品，没命中的不在里面。按 `skuId` 查，不要按下标对齐。
   */
  promotionItems: PromotionItem[]
  /**
   * 每个商品的优惠明细，与 `items` 按 `skuId` 对应。
   *
   * ⚠️ 行数不一定和 `fareItems` 一样：运费覆盖全部商品，优惠只覆盖券适用范围内的那些，
   *    范围外的商品不会出现在这里。按 `skuId` 查，不要按下标对齐。
   */
  couponItems: CouponItem[]
  /**
   * 每个商品的积分抵扣明细，与 `items` 按 `skuId` 对应。
   *
   * ⚠️ 积分没有适用范围，所以这里覆盖全部商品 —— 与只覆盖部分商品的 `couponItems` 不同。
   *    没用积分时为空数组。
   */
  integrationItems: IntegrationItem[]
  /**
   * 本单可得的赠送积分与成长值，由后端按同一份算法算好（与下单入账同源），前端只显示。
   *
   * ⚠️ 不要拿商品详情页的"每件可得"乘件数来算：按件数相乘后取整不是线性的，会差几分。
   */
  giftIntegration: number
  /** 本单可得的赠送成长值，口径同上 */
  giftGrowth: number
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

/** 单个商品的促销减免明细。 */
export interface PromotionItem {
  skuId: number
  /** 该商品命中的促销减免额 */
  discountAmount: number
}

/** 单个商品的积分抵扣明细。 */
export interface IntegrationItem {
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
 * ⚠️ 这不是"只算运费"：**任何影响价格的参数变了都要重算** —— 换收货地址、换券、改使用的积分数，
 *    带上当前选中的 `couponHistoryId` 与 `useIntegration` 再调一次，否则应付金额会退回原价，
 *    提交时被判成 17002。商品清单由后端按购物车自己取，前端不传。
 *    金额都由后端算定，前端不要自己按「商品总额 + 运费 − 促销 − 券 − 积分」重算。
 *    后端会校验地址归属，不是自己的地址返回 17004。
 */
export interface FareResult {
  /** 商品总额，不含运费 */
  totalAmount: number
  /** 整单运费 */
  freightAmount: number
  /** 商品促销减免额；没有命中满减或阶梯价时为 0 */
  promotionAmount: number
  /** 券的抵扣额；没用券时为 0 */
  couponAmount: number
  /** 积分抵扣额；没用积分时为 0 */
  integrationAmount: number
  /** 应付总额 = totalAmount + freightAmount − promotionAmount − couponAmount − integrationAmount */
  payAmount: number
  /**
   * 本单最多可用的积分数；为 0 表示本单用不了积分。
   *
   * ⚠️ 换券会改变这个数（封顶按促销后金额再减券算），所以它必须跟着金额一起重算 —— 页面用它限定输入范围。
   */
  integrationLimit: number
  /** 每个商品的运费明细 */
  fareItems: FareItem[]
  /** 每个商品的促销减免明细；没命中时为空数组 */
  promotionItems: PromotionItem[]
  /** 每个商品的优惠明细；没用券时为空数组 */
  couponItems: CouponItem[]
  /** 每个商品的积分抵扣明细；没用积分时为空数组 */
  integrationItems: IntegrationItem[]
  /** 本单可得的赠送积分，与确认页同一份口径 */
  giftIntegration: number
  /** 本单可得的赠送成长值 */
  giftGrowth: number
}
