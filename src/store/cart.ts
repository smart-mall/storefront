/**
 * 购物车状态。
 *
 * 为什么进 store：头部角标、详情页加购、购物车页三处共享同一份数据，
 * 而且它不可能从 URL 派生（和搜索条件那种"URL 是唯一真相"的完全不同）。
 *
 * ⚠️ 所有写操作后端都返回整车，所以这里的动作统一是「拿响应整体覆盖」：
 *    不自己累加、不自己算总价 —— 前端再算一遍就是同一个公式两份实现。
 */

import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import {
  addCartItem,
  changeCartItemCount,
  checkCartItem,
  checkCartItems,
  deleteCartItem,
  deleteCartItems,
  fetchCart,
} from '@/api/cart'
import { useAuthStore } from '@/store/auth'
import type { Cart, CartItem } from '@/type'

export const useCartStore = defineStore('cart', () => {
  const auth = useAuthStore()

  /* ═══════════════════ state ═══════════════════ */

  /**
   * null = 还没加载过。空车是 `{ items: [], countNum: 0, ... }`，
   * 两者必须分开 —— 否则"没加载"会被当成"车是空的"，页面直接闪一个空态。
   */
  const cart = ref<Cart | null>(null)

  /** 整车请求进行中，页面用它显示骨架屏 */
  const loading = ref(false)

  /** 已经成功加载过一次。用来避免头部和购物车页各拉一次 */
  const loaded = ref(false)

  /** 加载失败的原因，页面据此显示错误态和"重新加载" */
  const error = ref<string | null>(null)

  /**
   * 有写操作在飞。控件靠它禁用。
   *
   * 为什么需要：数量选择器每改一次就是一个请求，连点会打出并发请求，
   * 而响应到达顺序不保证 —— 后到的"旧"响应会把新数量覆盖回去，
   * 表现成"点了 + 但它自己跳回去了"。一个全局的 pending 就够，购物车不值得为此上乐观更新。
   */
  const pending = ref(false)

  /* ═══════════════════ getters ═══════════════════ */

  const items = computed<CartItem[]>(() => cart.value?.items ?? [])

  /** 总件数，含未勾选项。头部角标用它 */
  const countNum = computed<number>(() => cart.value?.countNum ?? 0)

  /** 应付总价（只算勾选项），后端算好的 */
  const totalAmount = computed<number>(() => cart.value?.totalAmount ?? 0)

  const checkedItems = computed<CartItem[]>(() => items.value.filter((item) => item.check))

  const allChecked = computed(
    () => items.value.length > 0 && checkedItems.value.length === items.value.length,
  )

  /** 空车。⚠️ 用 `cart.value !== null` 做前提，避免把"还没加载"算成空 */
  const isEmpty = computed(() => cart.value !== null && items.value.length === 0)

  /* ═══════════════════ actions ═══════════════════ */

  /**
   * 购物车接口全部要求登录，未登录时后端返回 code 15004。
   *
   * 而请求层对"未授权"只打 console、不弹 ElMessage（它只负责清掉登录态），
   * 用户看到的就是"点了没反应"。所以这里先把请求拦下来、直接弹登录框，
   * 让它变成一个明确的行为。
   */
  function requireLogin(): boolean {
    if (auth.isLoggedIn) {
      return true
    }
    auth.openLoginDialog()
    return false
  }

  function reset(): void {
    cart.value = null
    loaded.value = false
    error.value = null
  }

  /**
   * 拉整车。
   *
   * `loaded` / `loading` 两个判断是为了"头部挂载时拉一次、购物车页挂载时又拉一次"
   * 只发一个请求；要强制刷新（错误重试）就传 force。
   */
  async function loadCart(force = false): Promise<void> {
    if (!requireLogin()) {
      return
    }
    if (!force && (loaded.value || loading.value)) {
      return
    }
    loading.value = true
    error.value = null
    try {
      cart.value = await fetchCart()
      loaded.value = true
    } catch (e) {
      // 请求层已经报过了（console / ElMessage），这里只留一份给页面显示
      error.value = e instanceof Error ? e.message : '购物车加载失败'
      if (!auth.isLoggedIn) {
        // token 中途失效，拦截器已经清空了登录态，车也别留着了
        reset()
      }
    } finally {
      loading.value = false
    }
  }

  /**
   * 所有写操作的共同外壳：串行化 + 用响应覆盖整车。
   *
   * @returns 是否成功。失败不抛异常 —— 业务错误（code != 0，例如数量超限）
   *          请求层已经弹过提示了，页面只需要"成功时再做点什么"。
   */
  async function mutate(action: () => Promise<Cart>): Promise<boolean> {
    if (!requireLogin()) {
      return false
    }
    if (pending.value) {
      return false
    }
    pending.value = true
    try {
      cart.value = await action()
      loaded.value = true
      error.value = null
      return true
    } catch {
      if (!auth.isLoggedIn) {
        reset()
      }
      return false
    } finally {
      pending.value = false
    }
  }

  function addItem(skuId: number, num: number): Promise<boolean> {
    return mutate(() => addCartItem({ skuId, num }))
  }

  function updateCount(skuId: number, num: number): Promise<boolean> {
    return mutate(() => changeCartItemCount(skuId, { num }))
  }

  function checkOne(skuId: number, checked: boolean): Promise<boolean> {
    return mutate(() => checkCartItem(skuId, { checked }))
  }

  function checkMany(skuIds: number[], checked: boolean): Promise<boolean> {
    return mutate(() => checkCartItems({ skuIds, checked }))
  }

  function removeOne(skuId: number): Promise<boolean> {
    return mutate(() => deleteCartItem(skuId))
  }

  function removeMany(skuIds: number[]): Promise<boolean> {
    return mutate(() => deleteCartItems(skuIds))
  }

  /**
   * 跟着登录态自动装载 / 清空。
   *
   * 放在 store 里而不是某个页面里：头部角标和购物车页都要它，谁先挂载不确定；
   * 而且"登录了就有车、退出了就没车"本来就是购物车这个领域的事，
   * 让每个页面各写一遍 watch 只会漏掉其中一个。
   *
   * 首次实例化时 auth 很可能还是 unknown（localStorage 里有 token 但没验证过），
   * 那次会走到 reset()，没有副作用。
   */
  watch(
    () => auth.isLoggedIn,
    (loggedIn) => {
      if (loggedIn) {
        void loadCart()
      } else {
        reset()
      }
    },
    { immediate: true },
  )

  return {
    cart,
    loading,
    loaded,
    error,
    pending,
    items,
    countNum,
    totalAmount,
    checkedItems,
    allChecked,
    isEmpty,
    loadCart,
    addItem,
    updateCount,
    checkOne,
    checkMany,
    removeOne,
    removeMany,
    reset,
  }
})
