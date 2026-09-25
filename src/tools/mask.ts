/**
 * 联系方式的打码显示。
 *
 * 放 tools/ 是因为它是纯函数：个人中心要显示打码后的手机号/邮箱，
 * 订单详情以后要显示收货人电话，两处不该各写一份。
 */

/** 138****8888。长度不是 11 位（历史数据）就原样返回，别硬切 */
export function maskMobile(mobile: string | null | undefined): string {
  if (!mobile) {
    return ''
  }
  return mobile.length === 11 ? `${mobile.slice(0, 3)}****${mobile.slice(7)}` : mobile
}

/** a***@example.com。保留首字母和域名，域名部分不打码（否则用户认不出是哪个邮箱） */
export function maskEmail(email: string | null | undefined): string {
  if (!email) {
    return ''
  }
  const at = email.indexOf('@')
  if (at <= 0) {
    return email
  }
  const name = email.slice(0, at)
  return `${name.slice(0, 1)}${'*'.repeat(Math.max(name.length - 1, 1))}${email.slice(at)}`
}
