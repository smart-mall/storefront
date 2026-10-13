/**
 * 商品评价。
 *
 * 对应后端 product 模块：
 *   GET    /api/product/front/jwt/comment/my    → 我的评价分页
 *   POST   /api/product/front/jwt/comment       → 提交评价
 *   DELETE /api/product/front/jwt/comment/{id}  → 删除自己的一条评价
 *
 * ⚠️ 这里是**按前端用到的字段挑出来的投影**，不是 pms_spu_comment 的完整镜像：
 *    后端还会返回会员昵称、点赞数、回复数等暂时用不上的列。
 */

/** 我写的一条评价 */
export interface MyComment {
  id: number
  /** 来源订单项 ID：评价按订单项记，不是按整单记 */
  orderItemId: number
  skuId: number
  /** 商品名（下单那一刻的快照，不是当前商品名） */
  spuName: string
  /** 购买时的销售属性组合，后端用 ";" 连接 */
  spuAttributes: string | null
  /** 星级评分 1~5 */
  star: number
  content: string
  /**
   * 评价时间，形如 `"2026-10-13 15:36:38"`。
   * ⚠️ 不是 ISO8601：后端 Jackson 配的是 `yyyy-MM-dd HH:mm:ss`，要显示就直接用字符串。
   */
  createTime: string
}

/**
 * 订单项上的评价摘要，由订单列表接口随订单项一起带回。
 *
 * `OrderLine.comment` 为空表示这一项还没评价 —— 会员端据此决定按钮显示「评价」还是「查看评论」。
 */
export interface CommentBrief {
  commentId: number
  orderItemId: number
  star: number
  content: string
  createTime: string
}

/**
 * 我的评价分页。
 *
 * ⚠️ 字段名是后端 `common/vo/PageVO` 的形状（total / rows），与检索结果那套不一样。
 */
export interface CommentPage {
  total: number
  rows: MyComment[]
}
