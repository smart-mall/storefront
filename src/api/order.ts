/**
 * 订单模块接口。
 *
 * 对应后端 order 服务，经网关 53000 的 `/api/order/front/jwt/**` 转发（`jwt` 这一段表示要求登录）。
 *
 * ⚠️ 未登录时后端返回 code 15004，请求层会清掉本地登录态。
 *    另外后端对每个涉及具体订单/地址的接口都会校验归属，不属于自己的一律返回
 *    17000「订单不存在」—— 它不会告诉你"这个订单存在，只是不是你的"。
 */

import { myAxios } from '@/tools/request'
import type {
  FareResult,
  Order,
  OrderConfirm,
  OrderPage,
  OrderStatusResult,
  PayResult,
  PayType,
  Result,
  ReturnReason,
  SubmitOrderPayload,
  SubmitOrderResult,
} from '@/type'

/**
 * 结算页数据：收货地址、已勾选商品、库存、可用券、积分、防重令牌、金额。
 *
 * @param couponHistoryId 选中的券；不传或传 null 表示不用券。
 *   ⚠️ 换券后必须重新请求本接口，用返回的 payAmount 提交 —— 抵扣额由后端算，
 *      前端拿券面金额自己减会与提交时的校验算成两个数，被判成 17002。
 * @param useIntegration 使用的积分数量；不传或传 null 表示不用积分。超上限返回 15010、超余额返回 15009。
 */
export async function fetchOrderConfirm(
  couponHistoryId?: number | null,
  useIntegration?: number | null,
): Promise<OrderConfirm> {
  // 不用券/不用积分时不能传空串：后端是 Long/Integer，空串会被当成参数绑定失败
  const params: Record<string, number> = {}
  if (couponHistoryId != null) {
    params.couponHistoryId = couponHistoryId
  }
  if (useIntegration != null) {
    params.useIntegration = useIntegration
  }

  const res = await myAxios.get<Result<OrderConfirm>>('/order/front/jwt/confirm', { params })
  return res.data.data
}

/**
 * 影响价格的参数变了就重算结算金额。
 *
 * ⚠️ 它不只算运费：换地址要重算，换券要重算，改使用的积分数也要重算。换地址时不带上当前
 *    选中的券与积分，拿回来的 payAmount 会退回原价（两者的效果被丢掉），提交时被判成 17002。
 *    返回的 `integrationLimit` 会跟着券变，页面的积分上限要取这一份。
 *    addrId 不是自己的地址时后端返回 17004。
 */
export async function fetchFare(
  addrId: number,
  couponHistoryId?: number | null,
  useIntegration?: number | null,
): Promise<FareResult> {
  const params: Record<string, number> = { addrId }
  if (couponHistoryId != null) {
    params.couponHistoryId = couponHistoryId
  }
  if (useIntegration != null) {
    params.useIntegration = useIntegration
  }

  const res = await myAxios.get<Result<FareResult>>('/order/front/jwt/fare', { params })
  return res.data.data
}

/**
 * 提交订单。
 *
 * 失败会抛 Error（请求层已经弹过提示），常见 code：
 *   17001 令牌已失效（确认页开太久，或者已经提交过一次）→ 调用方应重新拉确认页
 *   17002 价格已变动 → 同上
 *   17004 收货地址不属于当前用户
 *   21000 库存不足
 */
export async function submitOrder(payload: SubmitOrderPayload): Promise<SubmitOrderResult> {
  const res = await myAxios.post<Result<SubmitOrderResult>>('/order/front/jwt/submit', payload)
  return res.data.data
}

/**
 * 我的订单分页。
 *
 * ⚠️ 分页参数是 `page` / `limit`，**不是**检索那套 `pageNum` / `pageSize` ——
 *    后端 `OrderPageQuery` 继承 `common/query/PageQuery`，参数名固定为这两个；
 *    传 pageNum/pageSize 会被当未知参数忽略，于是永远只拿到第一页。
 */
export async function fetchOrderPage(params: {
  page: number
  limit: number
  /** 不传就是全部状态 */
  status?: number
}): Promise<OrderPage> {
  const res = await myAxios.get<Result<OrderPage>>('/order/front/jwt/list', { params })
  return res.data.data
}

/** 订单详情（含订单项） */
export async function fetchOrderDetail(orderSn: string): Promise<Order> {
  const res = await myAxios.get<Result<Order>>(`/order/front/jwt/detail/${orderSn}`)
  return res.data.data
}

/**
 * 发起支付。
 *
 * 支付宝返回一整段 HTML 表单，微信返回二维码内容，见 `PayResult`。
 * 只有待付款的订单能发起，否则后端返回 17003。
 */
export async function payOrder(orderSn: string, payType: PayType): Promise<PayResult> {
  const res = await myAxios.post<Result<PayResult>>(`/order/front/jwt/pay/${orderSn}`, { payType })
  return res.data.data
}

/** 查订单支付状态，支付页用它轮询 */
export async function fetchOrderStatus(orderSn: string): Promise<OrderStatusResult> {
  const res = await myAxios.get<Result<OrderStatusResult>>(`/order/front/jwt/status/${orderSn}`)
  return res.data.data
}

/** 取消未支付的订单。后端会同时通知仓库释放库存 */
export async function cancelOrder(orderSn: string): Promise<void> {
  await myAxios.put<Result<null>>(`/order/front/jwt/cancel/${orderSn}`)
}

/**
 * 确认收货。
 *
 * 只有已发货的订单能确认，否则后端返回 17003；被自动确认任务抢先确认的订单也走这一分支，
 * 调用方按"状态已变"处理即可 —— 重新拉一次列表就对了。
 */
export async function receiveOrder(orderSn: string): Promise<void> {
  await myAxios.put<Result<null>>(`/order/front/jwt/receive/${orderSn}`)
}

/**
 * 删除自己的订单：只把订单标记为已删除，会员端列表不再返回它，数据本身保留。
 *
 * 只有已完成（3）与已取消（4）的订单能删，其余状态后端返回 17003；重复删除同一订单也是 17003。
 * 调用方按"状态已变"处理即可 —— 重新拉一次列表就对了。
 */
export async function deleteOrder(orderSn: string): Promise<void> {
  await myAxios.put<Result<null>>(`/order/front/jwt/delete/${orderSn}`)
}

/* ═══════════════════ 售后（仅退款 / 退货退款） ═══════════════════ */

/**
 * 申请整单退款（仅退款）。
 *
 * 只有「已付款、还没发货」的订单能申请，否则后端返回 17003；已经有一笔进行中的退款申请返回 17013。
 * ⚠️ 提交后**不会立刻退钱**：要走后台审核，通过时才向支付平台发起退款 —— 平台回了"资金已变动"，
 *    订单才作废、库存与券和积分才退回。
 */
export async function applyRefund(payload: {
  orderSn: string
  /** 申请说明，必填；退款没有原因字典，话都写在这里 */
  description: string
}): Promise<void> {
  await myAxios.post<Result<null>>('/order/front/jwt/after-sale/refund', payload)
}

/**
 * 申请退货退款（按订单项）。
 *
 * 只有「已完成」的订单、且这一项没有进行中的退货申请时才能申请（否则 17003 / 17013）。
 * 金额按这一项的实付算，整项退 —— 不支持只退一部分数量。
 */
export async function applyReturn(payload: {
  orderItemId: number
  /** 退货原因，必填，取自退货原因字典 */
  reason: string
  description?: string
  /** 凭证图片，逗号隔开；先由 uploadImage 上传拿到地址 */
  descPics?: string
}): Promise<void> {
  await myAxios.post<Result<null>>('/order/front/jwt/after-sale/return', payload)
}

/**
 * 退货原因选项。
 *
 * 来自 `oms_order_return_reason`，后台能维护它，所以前端不写死一份（写死等于同一份清单存在两处）。
 */
export async function fetchReturnReasons(): Promise<ReturnReason[]> {
  const res = await myAxios.get<Result<ReturnReason[]>>('/order/front/jwt/after-sale/reasons')
  return res.data.data
}
