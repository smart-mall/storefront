/**
 * 订单实体与订单列表分页。
 *
 * 对应后端 order 模块：
 *   GET /api/order/front/jwt/list             → OrderPage
 *   GET /api/order/front/jwt/detail/{orderSn} → Order
 *   GET /api/order/front/jwt/status/{orderSn} → OrderStatusResult
 *
 * ⚠️ 这里的接口是**按前端用到的字段挑出来的投影**，不是 oms_order 的完整镜像 ——
 *    后端还会返回发票、促销金额、物流公司等一大堆暂时用不上的字段。
 *    挑着写是为了让"前端依赖了后端什么"这件事可读；后端加字段不影响这里。
 */

import type { CommentBrief } from '../comment/comment'

/** 订单项，对应 oms_order_item */
export interface OrderLine {
  /** 订单项主键。提交评价时按它定位来源，后端靠它认「这一项评过没有」 */
  id: number
  skuId: number
  /** 商品名（下单那一刻的快照，不是当前商品名） */
  skuName: string
  skuPic: string
  /** 下单时的单价 */
  skuPrice: number
  skuQuantity: number
  /** 销售属性拼成的字符串，后端用 ";" 连接，形如 "颜色：霓影紫;套餐：套餐二" */
  skuAttrsVals: string | null
  /** 这一项的实付（单价 × 数量 − 优惠） */
  realAmount: number
  /**
   * 这一项的评价摘要；为空表示还没评价。
   *
   * 由后端订单列表装配时向 product 批量取回（一次请求，不是逐项查）；取不到时一律当未评价处理。
   */
  comment?: CommentBrief | null
  /**
   * 这一项现在能不能申请退货。
   *
   * 由后端按「订单已完成 + 这一项没有正在进行或已完成的退货申请」算好，前端只按它决定显不显示按钮 ——
   * 前端自己拼这两条条件，迟早会与后端的闸门分叉。
   */
  canApplyReturn?: boolean
}

/**
 * 订单状态，取值见后端 `order/enume/OrderStatusEnum`。
 *
 * ⚠️ 只用来做类型约束和分支判断，**不要在前端再维护一份文案映射** ——
 *    后端每个订单都带了 statusText，那是显示文案的唯一来源。
 */
export type OrderStatus = 0 | 1 | 2 | 3 | 4

export interface Order {
  id: number
  orderSn: string
  /**
   * 下单时间，形如 `"2026-09-21 15:20:18"`。
   * ⚠️ 不是 ISO8601：后端 Jackson 配的是 `yyyy-MM-dd HH:mm:ss`，
   *    所以 `new Date(createTime)` 在部分浏览器上解析不出来，要显示就直接用字符串。
   */
  createTime: string
  status: OrderStatus
  /** 状态文案，后端按 OrderStatusEnum 填好的 */
  statusText: string
  /** 商品总额（不含运费） */
  totalAmount: number
  freightAmount: number
  /** 应付总额 = totalAmount + freightAmount */
  payAmount: number
  /** 支付方式：1 支付宝 / 2 微信；未支付时为 null */
  payType: number | null
  paymentTime: string | null

  receiverName: string
  receiverPhone: string
  receiverProvince: string | null
  receiverCity: string | null
  receiverRegion: string | null
  receiverDetailAddress: string

  /** 买家备注 */
  note: string | null

  /** 订单项。列表接口也会带上（后端一次 IN 查询再按订单号分组，不是 N+1） */
  orderItemEntityList: OrderLine[]

  /**
   * 这一单的售后申请（整单退款与按项退货都挂在这里）。空数组表示没申请过售后。
   *
   * 列表与详情都会带，所以卡片上不需要再单独请求一次售后接口。
   */
  afterSaleList?: OrderAfterSale[]

  /**
   * 现在能不能申请整单退款。
   *
   * 判据在后端：订单已付款且还没发货，且没有一笔进行中的退款申请。发货之后这批货已经出库实扣，
   * 没有可解锁的库存，那时该走退货 —— 所以这个布尔值不是"状态等于几"能推出来的。
   */
  canApplyRefund?: boolean
}

/** 售后类型：0 仅退款（已付款未发货，整单退钱）/ 1 退货退款（确认收货后按项寄回） */
export type AfterSaleType = 0 | 1

/**
 * 售后状态：0 待处理 / 1 退货中（只有退货会经过这一态）/ 2 已完成 / 3 已拒绝。
 *
 * ⚠️ 与订单状态一样，**不要在前端维护文案**：每行都带后端填好的 statusText。
 */
export type AfterSaleStatus = 0 | 1 | 2 | 3

/**
 * 一条售后申请（后端 `MemberAfterSaleVo`）。
 *
 * 它是公开投影而不是整张 `oms_order_return_apply`：处理这项申请的管理员用户名不出给会员端。
 */
export interface OrderAfterSale {
  id: number
  orderSn: string
  type: AfterSaleType
  /** 类型文案，后端填好 */
  typeText: string
  status: AfterSaleStatus
  /** 状态文案，后端填好 */
  statusText: string
  /** 退款金额：仅退款是整单实付，退货是这一项的实付 */
  returnAmount: number
  /** 退货的商品；仅退款不涉及具体商品，这几个字段为 null */
  skuId: number | null
  skuName: string | null
  skuImg: string | null
  skuAttrsVals: string | null
  skuCount: number | null
  /** 退货原因；仅退款没有原因字典，为 null，话都写在 description 里 */
  reason: string | null
  description: string | null
  /** 凭证图片，逗号隔开 */
  descPics: string | null
  createTime: string
  handleTime: string | null
  /** 处理备注；被拒绝时就是驳回理由 */
  handleNote: string | null
  /** 商家的退货地址，审核通过后才下发，会员照着寄回 */
  companyAddress: string | null
  receiveMan: string | null
  receivePhone: string | null
  receiveTime: string | null
  receiveNote: string | null
}

/** 退货原因选项，来自 `oms_order_return_reason`（后台可维护，前端不写死一份） */
export interface ReturnReason {
  id: number
  name: string
}

/**
 * 订单列表分页。
 *
 * ⚠️ 字段名和检索结果（`SearchPage`）**不一样**，别照抄：
 *    这里是后端 `common/vo/PageVO` 的形状（total / rows），而检索用的是 search 自己的
 *    SearchResult（pageNum / total / totalPages / product）。两个后端模块各写各的。
 */
export interface OrderPage {
  /** 总条数，给分页组件用 */
  total: number
  /** 当前页的订单。列表接口也会带上每单的 orderItemEntityList */
  rows: Order[]
}

/**
 * 订单状态接口的返回。
 *
 * 比 Order 瘦很多：同一条路径的内部版本（`/order/order/status/{orderSn}`）是给 ware
 * 在释放库存前判断订单是否已取消用的，而那个接口在白名单里免登录，所以刻意只返回这几个字段。
 */
export interface OrderStatusResult {
  orderSn: string
  status: OrderStatus
  statusText: string
}
