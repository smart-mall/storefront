/**
 * 提交订单与支付。
 *
 * 对应后端：
 *   POST /api/order/front/submit         → SubmitOrderResult
 *   POST /api/order/front/pay/{orderSn}  → PayResult
 *   PUT  /api/order/front/cancel/{orderSn}
 */

/** 支付方式，取值对应后端 `order/constant/PayConstant` */
export type PayType = 1 | 2

export interface SubmitOrderPayload {
  /** 收货地址 id。必须是自己的地址，否则后端返回 17004 */
  addrId: number
  payType: PayType
  /** 确认页拿到的防重令牌，一次性；用过或过期返回 17001 */
  orderToken: string
  /**
   * 应付金额。
   *
   * ⚠️ 必须原样回传确认页（或换地址后用 `/fare` 重算的）**含运费**的 payAmount。
   *    后端会拿它和重新算出来的金额比对，不一致返回 17002。
   */
  payPrice: number
  /** 订单备注，选填 */
  remarks?: string
}

/**
 * 提交订单成功的返回。
 *
 * 后端把整个 `OrderEntity` 放进来了，这里只声明前端要用的两个字段 ——
 * 注意它**不含** `orderItemEntityList`（那是在内存里组装、还没回查的），
 * 所以不能直接当成 `Order` 用。
 */
export interface SubmitOrderResult {
  order: {
    orderSn: string
    payAmount: number
  }
}

/**
 * 发起支付的返回。
 *
 * 两种支付方式给的东西形态完全不同，所以只有一个字段会有值：
 *   - 支付宝 → `form`，一整段 HTML 表单
 *   - 微信   → `codeUrl`，二维码内容
 */
export interface PayResult {
  payType: PayType
  /**
   * 支付宝：一整段 HTML 表单，浏览器显示它就会自动跳到收银台。
   * 前端要把它写进一个**新开的窗口**再让浏览器解析 ——
   * 写进当前页面等于把 SPA 整个导航走，回来时页面状态全没了。
   */
  form: string | null
  /** 微信：二维码内容（`weixin://...`） */
  codeUrl: string | null
}
