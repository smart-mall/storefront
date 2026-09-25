/**
 * 收货地址。
 *
 * 属于 member 域（ums_member_receive_address）。原先挂在 order 域下（只有结算流程会用到），
 * member 补出自己的前台接口后挪到这里 —— 结算页和会员中心用的是同一个实体，不该有两份。
 */

export interface MemberAddress {
  id: number
  memberId: number
  name: string
  phone: string
  postCode: string | null
  province: string | null
  city: string | null
  region: string | null
  detailAddress: string
  areacode: string | null
  /** 1 = 默认地址 */
  defaultStatus: number | null
}

/**
 * 新增 / 修改收货地址的请求体。
 *
 * 不带 memberId：归属由后端的登录态决定，前端传不了也不该传。
 */
export interface AddressSaveForm {
  name: string
  phone: string
  postCode?: string | null
  province: string
  city: string
  region: string
  detailAddress: string
  areacode?: string | null
  /**
   * 只表示"把这条设为默认"。
   *
   * 传 false **不会**取消默认 —— 默认地址必须恰好有一条，否则结算页取默认地址时会飘。
   * 换默认只能靠把另一条设为默认。
   */
  defaultStatus?: boolean
}

/**
 * 行政区划树的节点，对应 third-party 的 `GET /api/thirdParty/address/tree`。
 *
 * ⚠️ 节点上**没有层级字段**（后端是 `AreaTreeNode{code,name,children}`，而表里的
 * `NODE_LEVEL` 没有暴露出来），树最深到居委会，而收货地址只要省市区三级 ——
 * 展示前必须用 `pruneAddressTree` 按深度裁一下，否则用户会一路点到居委会。
 */
export interface AreaNode {
  code: string
  name: string
  /**
   * ⚠️ 后端叶子节点发的是 `children: null`，而 el-cascader 的 `CascaderOption` 只认
   *    `children?: CascaderOption[]`（不接受 null），所以类型写成可选，
   *    并且裁剪时把空数组/ null 一律转成"没有这个字段"（见 `pruneAddressTree`）。
   */
  children?: AreaNode[]
}
