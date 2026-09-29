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
  SubmitOrderPayload,
  SubmitOrderResult,
} from '@/type'

/**
 * 结算页数据：收货地址、已勾选商品、库存、可用券、防重令牌、金额。
 *
 * @param couponHistoryId 选中的券；不传或传 null 表示不用券。
 *   ⚠️ 换券后必须重新请求本接口，用返回的 payAmount 提交 —— 抵扣额由后端算，
 *      前端拿券面金额自己减会与提交时的校验算成两个数，被判成 17002。
 */
export async function fetchOrderConfirm(couponHistoryId?: number | null): Promise<OrderConfirm> {
  const res = await myAxios.get<Result<OrderConfirm>>('/order/front/jwt/confirm', {
    // 不用券时不能传空串：后端是 Long，空串会被当成参数绑定失败
    params: couponHistoryId == null ? {} : { couponHistoryId },
  })
  return res.data.data
}

/**
 * 影响价格的参数变了就重算结算金额。
 *
 * ⚠️ 它不只算运费：换地址要重算，换券也要重算。换地址时不带上当前选中的券，
 *    拿回来的 payAmount 会退回原价（券的效果被丢掉），提交时被判成 17002。
 *    addrId 不是自己的地址时后端返回 17004。
 */
export async function fetchFare(
  addrId: number,
  couponHistoryId?: number | null,
): Promise<FareResult> {
  const res = await myAxios.get<Result<FareResult>>('/order/front/jwt/fare', {
    params: couponHistoryId == null ? { addrId } : { addrId, couponHistoryId },
  })
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
