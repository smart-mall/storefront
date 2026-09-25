/**
 * 会员中心接口。
 *
 * 对应后端三个模块：
 *   member       `PUT /api/member/front/profile`、`/api/member/front/address/**`、
 *                `GET /api/member/memberloginlog/mine`
 *   auth         `PUT /api/auth/user/mobile`、`PUT /api/auth/user/email`
 *   third-party  `GET /api/thirdParty/address/tree`（省市区字典，地址表单用）
 *
 * 会员身份一律由后端的登录态决定，前端不传 memberId。
 */

import { myAxios } from '@/tools/request'
import type {
  AddressSaveForm,
  AreaNode,
  ChangeContactForm,
  LoginLogPage,
  LoginResult,
  MemberAddress,
  ProfileUpdateForm,
  Result,
} from '@/type'

/* ═══════════════════ 资料 ═══════════════════ */

/**
 * 修改资料。
 *
 * ⚠️ 返回的是**新的 token**（形状和登录接口一样），因为昵称和头像在 JWT 里 ——
 *    不重签的话 token 里还是旧值。调用方拿到后要用 store 的 applyLogin 换掉本地登录态，
 *    否则头部的昵称/头像要等刷新页面才会变。
 *
 * 字段级失败（昵称超长等）由请求层弹出，调用方 catch 即可。
 */
export async function updateProfile(form: ProfileUpdateForm): Promise<LoginResult> {
  const res = await myAxios.put<Result<LoginResult>>('/member/front/profile', form)
  return res.data.data
}

/**
 * 换绑手机号。
 *
 * 新号码要先调 `sendSmsCode(新号码)` 拿验证码 —— 后端是"给任意号码发码"，
 * 不要求是当前绑定的那个。
 *
 * 号码已被其他账号绑定时后端返回 15006（msg 是中文，请求层会弹出来）。
 */
export async function changeMobile(form: ChangeContactForm): Promise<void> {
  await myAxios.put<Result<void>>('/auth/user/mobile', { mobile: form.value, code: form.code })
}

/** 换绑邮箱，语义同 changeMobile，占用时返回 15007 */
export async function changeEmail(form: ChangeContactForm): Promise<void> {
  await myAxios.put<Result<void>>('/auth/user/email', { email: form.value, code: form.code })
}

/**
 * 我的登录记录，按时间倒序。
 *
 * ⚠️ 分页参数是 `pageNum` / `pageSize`（和后端其它前台接口一致），pageSize 上限 100。
 */
export async function fetchLoginLogPage(params: {
  pageNum: number
  pageSize: number
}): Promise<LoginLogPage> {
  const res = await myAxios.get<Result<LoginLogPage>>('/member/memberloginlog/mine', { params })
  return res.data.data
}

/* ═══════════════════ 收货地址 ═══════════════════ */

/** 我的收货地址，默认地址排在最前（后端排好的） */
export async function fetchMyAddresses(): Promise<MemberAddress[]> {
  const res = await myAxios.get<Result<MemberAddress[]>>('/member/front/address')
  return res.data.data
}

/** 新增。第一条会自动成为默认；超过 20 条返回 15008 */
export async function createAddress(form: AddressSaveForm): Promise<MemberAddress> {
  const res = await myAxios.post<Result<MemberAddress>>('/member/front/address', form)
  return res.data.data
}

/** 修改。id 不属于自己时返回 17004（收货地址不存在） */
export async function updateAddress(id: number, form: AddressSaveForm): Promise<MemberAddress> {
  const res = await myAxios.put<Result<MemberAddress>>(`/member/front/address/${id}`, form)
  return res.data.data
}

/** 删除。删掉的是默认那条时，后端会把剩下最早的一条提为默认 */
export async function deleteAddress(id: number): Promise<void> {
  await myAxios.delete<Result<void>>(`/member/front/address/${id}`)
}

/** 设为默认。后端在同一事务里把其他地址的默认标记清掉 */
export async function setDefaultAddress(id: number): Promise<void> {
  await myAxios.put<Result<void>>(`/member/front/address/${id}/default`)
}

/**
 * 省市区字典树。
 *
 * ⚠️ 这是 third-party 的接口，不是 member 的 —— 它给的是全国行政区划（与用户无关），
 *    而"用户存了哪些地址"在 member。选省市区用这棵树，存地址用上面那几个接口。
 *
 * ⚠️ 树最深到居委会，展示前要按深度裁（见 `pruneAddressTree`）。
 */
export async function fetchAddressTree(): Promise<AreaNode[]> {
  const res = await myAxios.get<Result<AreaNode[]>>('/thirdParty/address/tree')
  return res.data.data
}
