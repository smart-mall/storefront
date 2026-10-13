/**
 * 商品评价：评价、回复与点赞。
 *
 * 对应后端 product 模块：
 *   GET    /api/product/front/jwt/comment/my            → 我的评价分页（含获赞数与回复）
 *   POST   /api/product/front/jwt/comment               → 提交评价
 *   DELETE /api/product/front/jwt/comment/{id}          → 删除自己的一条评价
 *   POST   /api/product/front/jwt/comment/{id}/like     → 点赞，返回新的获赞数
 *   DELETE /api/product/front/jwt/comment/{id}/like     → 取消点赞，返回新的获赞数
 *   POST   /api/product/front/jwt/comment/{id}/reply    → 发表回复，返回新回复
 *   GET    /api/product/front/comment/list              → 某件商品的评价分页（公开）
 *   GET    /api/product/front/comment/summary           → 某件商品的评价统计（公开）
 *
 * ⚠️ 这里是**按前端用到的字段挑出来的投影**，不是 pms_spu_comment 的完整镜像：
 *    会员 ID、IP、显示状态这些列后端不下发。
 *
 * ⚠️ 点赞状态不在后端：接口只维护计数，"我点过哪些"由前端记在 localStorage，
 *    见 `@/tools/likedComments`。
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
  /** 获赞数，没人点赞时为 0 */
  likesCount: number
  /** 回复数，没人回复时为 0 */
  replyCount: number
  /** 别人在这条评价下的回复，按时间正序；没有回复时是空数组，不是 null */
  replies: CommentReply[]
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
 * 一条评价下的回复。
 *
 * 回复只有一层，不嵌套；内容与昵称都由后端下发，`memberNickName` 已在**服务端**打码。
 *
 * 回复也可以点赞：它和评价在同一张表里、ID 全局唯一，所以本地点赞记录（`@/tools/likedComments`）
 * 能同时装下评价与回复的 ID，不会互相覆盖。
 */
export interface CommentReply {
  id: number
  /** 打码后的昵称，形如 `tes***`；没有昵称时后端给「匿名会员」 */
  memberNickName: string
  content: string
  /** 回复时间，与评价时间同一格式 */
  createTime: string
  /** 获赞数，没人点赞时为 0 */
  likesCount: number
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

/**
 * 商品详情页评论区里的一条评价。
 *
 * 来自公开接口 `GET /product/front/comment/list`（不要求登录），昵称已在**服务端**打码，
 * 会员 ID 与 IP 不下发。
 */
export interface PublicComment {
  id: number
  /** 星级评分 1~5 */
  star: number
  content: string
  /** 打码后的昵称，形如 `tes***`；没有昵称时后端给「匿名会员」 */
  memberNickName: string
  /** 购买时的销售属性组合，后端用 ";" 连接；同款不同规格靠它区分 */
  spuAttributes: string | null
  createTime: string
  /** 获赞数，没人点赞时为 0 */
  likesCount: number
  /** 回复数；下发的回复是可见的那些，正常情况下与 `replies.length` 一致 */
  replyCount: number
  /** 这条评价下的回复，按时间正序；没有回复时是空数组，不是 null */
  replies: CommentReply[]
}

/**
 * 评价统计：总数、平均分与星级分布。
 *
 * 与列表同一套过滤口径（只算可见的直接评价），所以 `total` 与列表的 `total` 一致。
 */
export interface CommentSummary {
  total: number
  /** 平均星级，保留一位小数；没有评价时为 0 */
  averageStar: number
  /** 星级分布：key 是星级 1~5；**缺省的星级表示 0 条**，不是没有这个键 */
  starCounts: Record<number, number>
}

/** 公开评价分页（后端 PageVO 的形状：total / rows） */
export interface PublicCommentPage {
  total: number
  rows: PublicComment[]
}
