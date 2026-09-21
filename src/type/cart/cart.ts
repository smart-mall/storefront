/**
 * 购物车。
 *
 * 对应后端 cart 服务（经网关 53000 的 `/api/cart/**` 转发，剥掉 `/api` 后落到 `cart/...`）：
 *   GET    /cart/list                       整车
 *   GET    /cart/checked                    已勾选项（价格实时刷新）
 *   POST   /cart/items                      加购
 *   PUT    /cart/items/{skuId}/count        改数量
 *   PUT    /cart/items/{skuId}/check        勾选单项
 *   PUT    /cart/items/check                批量勾选 / 全选反选
 *   DELETE /cart/items/{skuId}              删单项
 *   DELETE /cart/items?skuIds=1&skuIds=2    批量删
 *
 * ⚠️ 除 `/cart/checked` 外，**每个写操作返回的都是整车**而不是被改的那一项。
 *    所以前端不要自己维护 totalAmount / countNum —— 后端已经算好了，
 *    前端再算一遍等于同一个公式有两份实现，早晚会不一致。
 */

export interface CartItem {
  skuId: number
  /**
   * 是否勾选参与结算。
   *
   * 类型是 boolean，但 Redis 里存的老数据可能是 null（字段是包装类型），
   * 那种情况下前端按"未勾选"处理即可。
   */
  check: boolean
  title: string
  image: string
  /** 商品套餐属性，形如 ["颜色: 霓影紫", "套餐: 套餐二"]；没有销售属性时为 null */
  skuAttrValues: string[] | null
  /** 单价。后端读购物车时会用商品服务的最新价覆盖，所以这里拿到的就是当前价 */
  price: number
  count: number
  /** 小计 = price × count，后端算好的 */
  totalPrice: number
}

export interface Cart {
  /** 空车时是 []，不是 null */
  items: CartItem[]
  /** 商品总件数，含未勾选项 */
  countNum: number
  /** 商品种类数（几个不同的 sku） */
  countType: number
  /** 应付总价，**只算勾选项** */
  totalAmount: number
  /** 减免金额。优惠券还没做，恒为 0 */
  reduce: number
}

export interface AddCartItemPayload {
  skuId: number
  /** 增量，不是绝对值；范围 1~99，越界后端返回 code=10001 */
  num: number
}

export interface ChangeCartItemCountPayload {
  /** 绝对值，不是增量；范围 1~99 */
  num: number
}

export interface CheckCartItemPayload {
  checked: boolean
}

export interface CheckCartItemsPayload {
  /** 要批量勾选的 skuId。后端不接受省略，也不接受空数组 */
  skuIds: number[]
  checked: boolean
}
