/**
 * 订单实体与订单列表分页。
 *
 * 对应后端 order 模块：
 *   GET /api/order/front/list             → OrderPage
 *   GET /api/order/front/detail/{orderSn} → Order
 *   GET /api/order/front/status/{orderSn} → OrderStatusResult
 *
 * ⚠️ 这里的接口是**按前端用到的字段挑出来的投影**，不是 oms_order 的完整镜像 ——
 *    后端还会返回发票、促销金额、物流公司等一大堆暂时用不上的字段。
 *    挑着写是为了让"前端依赖了后端什么"这件事可读；后端加字段不影响这里。
 */

/** 订单项，对应 oms_order_item */
export interface OrderLine {
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
}

/**
 * 订单状态，取值见后端 `order/enume/OrderStatusEnum`。
 *
 * ⚠️ 只用来做类型约束和分支判断，**不要在前端再维护一份文案映射** ——
 *    后端每个订单都带了 statusText，那是显示文案的唯一来源。
 */
export type OrderStatus = 0 | 1 | 2 | 3 | 4 | 5 | 6

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
}

/**
 * 订单列表分页。
 *
 * ⚠️ 字段名和检索结果（`SearchPage`）**不一样**，别照抄：
 *    这里是后端 `common/utils/PageUtils` 的形状（totalCount / pageSize / totalPage /
 *    currPage / list），而检索用的是 search 自己的 SearchResult
 *    （pageNum / total / totalPages / product）。两个后端模块各写各的。
 */
export interface OrderPage {
  totalCount: number
  pageSize: number
  totalPage: number
  /** 当前页，从 1 开始。相当于检索里的 pageNum */
  currPage: number
  list: Order[]
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
