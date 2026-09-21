/**
 * 登录态。
 *
 * 这是全项目**唯一**真正需要 store 的状态：
 *   - 跨页面：头部用户区、详情页、将来的结算页都要用
 *   - 生命周期长于页面：刷新后仍要恢复
 *   - 不能从 URL 派生
 * 搜索条件、商品列表、分类树都不放这里（搜索条件进 URL，其余是页面局部数据），
 * 否则 store 会变成一个和 URL 抢真相的"接口缓存层"。
 */

import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { accountLogin, emailLogin, fetchCurrentMember, smsLogin } from '@/api/auth'
import { clearToken, getToken, setToken, setUnauthorizedHandler } from '@/tools/request'
import type { AccountForm, EmailCodeForm, LoginResult, MemberProfile, MobileCodeForm } from '@/type'

/**
 * 登录态的三态。
 *
 * `unknown` 是必须的：应用启动时 localStorage 里可能有 token，但还没验证过。
 * 这时候头部既不能显示"登录"（token 可能有效），也不能显示用户名（还不知道是谁）。
 * 少了这一态，每次刷新都会闪一下"未登录"。
 */
export type AuthStatus = 'unknown' | 'guest' | 'member'

export const useAuthStore = defineStore('auth', () => {
  /* ═══════════════════ state ═══════════════════ */

  /** JWT 的镜像。真正的存放处是 localStorage，因为请求拦截器只认那里 */
  const token = ref<string | null>(getToken())
  const member = ref<MemberProfile | null>(null)
  const status = ref<AuthStatus>(token.value ? 'unknown' : 'guest')

  /** 登录弹窗开关。放这里而不是单开 UI store：触发点分散（头部、详情页、结算页），
   *  而"要不要登录"本质就是认证领域的事 */
  const loginDialogVisible = ref(false)

  /* ═══════════════════ getters ═══════════════════ */

  const isLoggedIn = computed(() => status.value === 'member')
  const displayName = computed(() => member.value?.nickname || member.value?.username || '')
  const avatar = computed(() => member.value?.header ?? '')

  /* ═══════════════════ actions ═══════════════════ */

  /**
   * 清空登录态。
   *
   * 注册给请求层：token 失效（HTTP 401）时由拦截器回调，
   * 避免出现"localStorage 清了、store 里还留着用户"的中间状态。
   */
  function clearSession(): void {
    token.value = null
    clearToken()
    member.value = null
    status.value = 'guest'
  }

  setUnauthorizedHandler(clearSession)

  /** 登录成功的统一收尾：token 双写 + 落用户 + 置状态 */
  function applyLogin(result: LoginResult): void {
    token.value = result.token
    // ⚠️ 必须双写：请求拦截器是从 localStorage 读 token 的，store 只是它的镜像
    setToken(result.token)
    member.value = result.user
    status.value = 'member'
  }

  /**
   * 恢复登录态。
   *
   * 只在 `unknown` 时真的发请求，所以路由守卫可以放心地每次导航都调它。
   * 注意昵称和头像要以这个接口的返回为准 —— JWT 里虽然也带了这两项，
   * 但用户改过头像之后 token 里还是旧值。
   */
  async function loadCurrentMember(): Promise<void> {
    if (status.value !== 'unknown') {
      return
    }
    if (!token.value) {
      status.value = 'guest'
      return
    }
    try {
      member.value = await fetchCurrentMember()
      status.value = 'member'
    } catch {
      // 401 时拦截器已经清过 localStorage，这里把 store 同步清掉；
      // 其余错误（网络抖动等）同样按未登录处理，避免卡在 unknown 出不来
      clearSession()
    }
  }

  async function loginByAccount(form: AccountForm): Promise<void> {
    applyLogin(await accountLogin(form))
  }

  async function loginByEmail(form: EmailCodeForm): Promise<void> {
    applyLogin(await emailLogin(form))
  }

  async function loginByMobile(form: MobileCodeForm): Promise<void> {
    applyLogin(await smsLogin(form))
  }

  function logout(): void {
    clearSession()
  }

  function openLoginDialog(): void {
    loginDialogVisible.value = true
  }

  function closeLoginDialog(): void {
    loginDialogVisible.value = false
  }

  return {
    token,
    member,
    status,
    loginDialogVisible,
    isLoggedIn,
    displayName,
    avatar,
    loadCurrentMember,
    loginByAccount,
    loginByEmail,
    loginByMobile,
    logout,
    openLoginDialog,
    closeLoginDialog,
  }
})
