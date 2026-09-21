<template>
  <div class="pay">
    <div v-if="loading && !order" class="pay__skeleton">
      <el-skeleton :rows="4" animated />
    </div>

    <EmptyState v-else-if="error" :description="error">
      <el-button type="primary" @click="execute">重新加载</el-button>
    </EmptyState>

    <template v-else-if="order">
      <section class="pay__card">
        <h1 class="pay__headline">{{ headline }}</h1>
        <p class="pay__sn">订单号：{{ order.orderSn }}</p>
        <p class="pay__amount">¥{{ order.payAmount.toFixed(2) }}</p>
        <p class="pay__meta">收货人：{{ order.receiverName }} {{ order.receiverPhone }}</p>
        <p class="pay__meta">{{ address }}</p>
      </section>

      <section v-if="order.status === 0" class="pay__card">
        <h2 class="pay__title">选择支付方式</h2>

        <div class="pay__types">
          <button
            v-for="option in PAY_OPTIONS"
            :key="option.value"
            type="button"
            class="pay__type"
            :class="{ 'pay__type--on': option.value === payType }"
            :disabled="paying"
            @click="payType = option.value"
          >
            {{ option.label }}
          </button>
        </div>

        <div class="pay__actions">
          <el-button type="primary" size="large" :loading="paying" @click="onPay">去支付</el-button>
          <el-button size="large" text :disabled="paying" @click="refreshStatus">
            我已完成支付，刷新状态
          </el-button>
        </div>

        <p v-if="polling" class="pay__polling">正在等待支付结果（已查询 {{ pollCount }} 次）…</p>

        <!--
          微信这条路在当前环境拿不到可用二维码：商户密钥还是配置里的 demo 值，
          后端会返回 17000 段的"发起微信支付失败"。真配好密钥之后这里会拿到 codeUrl，
          但前端渲染二维码需要额外的依赖，这轮没引入，先把原文给出来。
        -->
        <p v-if="codeUrl" class="pay__codeurl">
          微信二维码内容（前端未引入二维码渲染库，可直接复制到微信中打开）：
          <code>{{ codeUrl }}</code>
        </p>
      </section>

      <section v-else class="pay__card">
        <p class="pay__meta">该订单当前状态是「{{ order.statusText }}」，不需要支付。</p>
        <el-button @click="router.push({ name: 'order' })">查看我的订单</el-button>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElButton, ElMessage, ElSkeleton } from 'element-plus'
import EmptyState from '@/components/EmptyState/index.vue'
import { fetchOrderDetail, fetchOrderStatus, payOrder } from '@/api/order'
import { useAsyncData } from '@/composables/useAsyncData'
import { joinAddress } from '@/tools/address'
import type { PayType } from '@/type'

/**
 * 支付页。
 *
 * 支付宝返回的是一整段 HTML 表单，浏览器显示它就会自动跳到收银台 ——
 * 所以这里把它写进一个**新开的窗口**，而不是当前页面：
 * 写进当前页面等于把 SPA 整个导航走，支付回来时页面状态全没了，也没法轮询结果。
 * 新窗口消失不影响这个页面继续轮询订单状态。
 */
const route = useRoute()
const router = useRouter()

const orderSn = computed<string>(() => {
  const raw = route.params.orderSn
  return Array.isArray(raw) ? (raw[0] ?? '') : (raw ?? '')
})

const { data: order, loading, error, execute } = useAsyncData(() => fetchOrderDetail(orderSn.value))

const payType = ref<PayType>(1)
const paying = ref(false)
const codeUrl = ref<string | null>(null)
const polling = ref(false)
const pollCount = ref(0)

/** 轮询间隔和次数上限：3 秒一次，最多 2 分钟。超时后用户可以手动点"刷新状态" */
const POLL_INTERVAL_MS = 3000
const MAX_POLL_TIMES = 40

let timer: number | null = null

const headline = computed(() => {
  const status = order.value?.status
  if (status === 0) {
    return '订单提交成功，请尽快完成支付'
  }
  if (status === 1) {
    return '订单已支付'
  }
  return `订单状态：${order.value?.statusText ?? ''}`
})

const address = computed(() => {
  const current = order.value
  if (!current) {
    return ''
  }
  return joinAddress([
    current.receiverProvince,
    current.receiverCity,
    current.receiverRegion,
    current.receiverDetailAddress,
  ])
})

/** 与结算页同样的理由：EP 2.6 起 radio 的绑定属性变了，二选一不值得为它踩坑 */
const PAY_OPTIONS: { value: PayType; label: string }[] = [
  { value: 1, label: '支付宝' },
  { value: 2, label: '微信' },
]

onMounted(() => void execute())
onUnmounted(stopPolling)

async function onPay(): Promise<void> {
  const current = order.value
  if (!current || paying.value) {
    return
  }
  paying.value = true
  try {
    const result = await payOrder(current.orderSn, payType.value)
    if (result.form) {
      openAlipayForm(result.form)
      startPolling()
    } else if (result.codeUrl) {
      codeUrl.value = result.codeUrl
      startPolling()
    } else {
      ElMessage.warning('后端没有返回可用的支付信息')
    }
  } catch {
    // 请求层已经弹过提示。当前环境微信这条必然失败（商户密钥是 demo 值）
  } finally {
    paying.value = false
  }
}

function openAlipayForm(form: string): void {
  const win = window.open('', '_blank')
  if (!win) {
    ElMessage.warning('浏览器拦截了新窗口，请允许弹出窗口后重试')
    return
  }
  // 支付宝给的这段 HTML 里自带 submit 脚本，写进去就会被提交
  win.document.write(form)
  win.document.close()
}

function startPolling(): void {
  stopPolling()
  polling.value = true
  pollCount.value = 0
  timer = window.setInterval(() => void pollOnce(), POLL_INTERVAL_MS)
}

async function pollOnce(): Promise<void> {
  const current = order.value
  if (!current) {
    stopPolling()
    return
  }
  pollCount.value += 1
  try {
    const status = await fetchOrderStatus(current.orderSn)
    // 用替换而不是就地改：useAsyncData 的 data 是 shallowRef，
    // 就地改属性不会触发视图更新，必须换一个新对象
    order.value = { ...current, status: status.status, statusText: status.statusText }
    if (status.status !== 0) {
      stopPolling()
      ElMessage.success(`订单${status.statusText}`)
      return
    }
  } catch {
    // 单次轮询失败不打断，下一轮再试
  }
  if (pollCount.value >= MAX_POLL_TIMES) {
    stopPolling()
    ElMessage.info('还没有收到支付结果，完成支付后可以点"刷新状态"')
  }
}

function stopPolling(): void {
  if (timer !== null) {
    window.clearInterval(timer)
    timer = null
  }
  polling.value = false
}

function refreshStatus(): void {
  void pollOnce()
}
</script>

<style scoped>
.pay {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 16px;
}

.pay__skeleton {
  padding: 20px;
  background: var(--mall-surface);
  border: 1px solid var(--mall-border);
  border-radius: var(--mall-radius-card);
}

.pay__card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 24px;
  background: var(--mall-surface);
  border: 1px solid var(--mall-border);
  border-radius: var(--mall-radius-card);
}

.pay__headline {
  margin: 0;
  font-size: 18px;
  color: var(--mall-text);
}

.pay__sn,
.pay__meta {
  margin: 0;
  font-size: 13px;
  color: var(--mall-text-secondary);
}

.pay__amount {
  margin: 8px 0;
  font-size: 28px;
  font-weight: 600;
  color: var(--mall-primary);
  font-variant-numeric: tabular-nums;
}

.pay__title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--mall-text);
}

.pay__types {
  display: flex;
  gap: 12px;
  margin: 8px 0;
}

.pay__type {
  padding: 8px 20px;
  font: inherit;
  font-size: 14px;
  color: var(--mall-text);
  background: var(--mall-surface);
  border: 1px solid var(--mall-border);
  border-radius: 8px;
  cursor: pointer;
}

.pay__type:hover:not(:disabled) {
  border-color: var(--mall-primary);
}

.pay__type--on {
  color: var(--mall-primary);
  border-color: var(--mall-primary);
  background: var(--mall-primary-soft);
}

.pay__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pay__polling {
  margin: 0;
  font-size: 13px;
  color: var(--mall-text-secondary);
}

.pay__codeurl {
  margin: 0;
  font-size: 13px;
  color: var(--mall-text-secondary);
  word-break: break-all;
}

.pay__codeurl code {
  color: var(--mall-text);
}
</style>
