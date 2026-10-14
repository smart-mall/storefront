/**
 * 订单域的实体类型。
 *
 * 按用途分成三个文件：订单本体与列表、结算页数据、提交与支付。
 */

export type {
  AfterSaleStatus,
  AfterSaleType,
  Order,
  OrderAfterSale,
  OrderLine,
  OrderPage,
  OrderStatus,
  OrderStatusResult,
  ReturnReason,
} from './order'
export type {
  CheckoutItem,
  CouponItem,
  CouponUsable,
  FareItem,
  FareResult,
  IntegrationItem,
  OrderConfirm,
} from './confirm'
export type { PayResult, PayType, SubmitOrderPayload, SubmitOrderResult } from './pay'
