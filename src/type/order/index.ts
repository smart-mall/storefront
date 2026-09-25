/**
 * 订单域的实体类型。
 *
 * 按用途分成三个文件：订单本体与列表、结算页数据、提交与支付。
 */

export type { Order, OrderLine, OrderPage, OrderStatus, OrderStatusResult } from './order'
export type { CheckoutItem, FareResult, OrderConfirm } from './confirm'
export type { PayResult, PayType, SubmitOrderPayload, SubmitOrderResult } from './pay'
