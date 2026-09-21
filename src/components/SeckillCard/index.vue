<template>
  <article class="sk">
    <div class="sk__media" @click="goDetail">
      <img
        v-if="info"
        class="sk__img"
        :src="info.skuDefaultImg"
        :alt="info.skuTitle"
        loading="lazy"
      />
      <span v-else class="sk__img sk__img--empty">图片缺失</span>
      <span class="sk__badge">{{ phaseText }}</span>
    </div>

    <div class="sk__body">
      <h3 class="sk__title" @click="goDetail">{{ title }}</h3>

      <div class="sk__price">
        <span class="sk__now">¥{{ item.seckillPrice.toFixed(2) }}</span>
        <s v-if="info" class="sk__was">¥{{ info.price.toFixed(2) }}</s>
      </div>

      <p class="sk__meta">
        <span v-if="item.seckillLimit">每人限购 {{ item.seckillLimit }} 件</span>
        <span v-if="item.seckillCount">共 {{ item.seckillCount }} 件</span>
      </p>

      <div class="sk__foot">
        <span class="sk__clock">{{ clockText }}</span>
        <el-button
          type="danger"
          size="small"
          :disabled="phase !== 'active' || !item.randomCode"
          :loading="pending"
          @click="buy"
        >
          {{ phase === 'active' ? '立即抢购' : '不可抢购' }}
        </el-button>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElButton, ElMessage } from 'element-plus'
import { seckillKill } from '@/api/seckill'
import { formatCountdown, seckillPhase } from '@/tools/time'
import type { CurrentSeckill } from '@/type'

/**
 * 秒杀商品卡片。首页秒杀栏和秒杀页共用。
 *
 * `now` 由页面传进来而不是卡片自己起定时器：一页几十张卡，各起一个 setInterval 是浪费，
 * 而且同一个场次的商品倒计时是同一个值。
 */
const props = defineProps<{
  item: CurrentSeckill
  /** 当前时间戳，由页面的 useNow() 提供 */
  now: number
}>()

const emit = defineEmits<{ success: [orderSn: string] }>()

const router = useRouter()

/**
 * 后端把 sku 信息单独放一块，且**可能为 null**（上架时反查商品服务失败也会照写缓存）。
 * 所以标题、图片都要有兜底，不能直接 item.skuInfo.skuTitle。
 */
const info = computed(() => props.item.skuInfo)

const title = computed(() => info.value?.skuTitle ?? `商品 #${props.item.skuId}`)

const phase = computed(() => seckillPhase(props.item.startTime, props.item.endTime, props.now))

const phaseText = computed(() => {
  switch (phase.value) {
    case 'upcoming':
      return '即将开始'
    case 'active':
      return '抢购中'
    default:
      return '已结束'
  }
})

/** 未开始显示距开始还有多久，进行中显示距结束还有多久 */
const clockText = computed(() => {
  const target = phase.value === 'upcoming' ? props.item.startTime : props.item.endTime
  return formatCountdown(target - props.now)
})

const pending = ref(false)

function goDetail(): void {
  void router.push({ name: 'item', params: { skuId: props.item.skuId } })
}

/**
 * 抢购。
 *
 * killId 是后端 Redis hash 的 field，格式固定为 `场次id-skuId`，必须由前端拼好原样回传；
 * randomCode 只在秒杀进行中才随商品详情下发，它本身就是"这张页面还有效"的凭证。
 *
 * ⚠️ 拿到订单号不等于订单已存在：后端发 MQ 后由 order 异步建单。
 *    所以这里不往 /pay/{orderSn} 跳（那一刻查订单是 17000），而是交给页面决定去哪。
 */
async function buy(): Promise<void> {
  const code = props.item.randomCode
  if (phase.value !== 'active' || !code) {
    return
  }
  const killId = `${props.item.promotionSessionId}-${props.item.skuId}`
  pending.value = true
  try {
    const orderSn = await seckillKill(killId, code, 1)
    ElMessage.success('抢购成功，订单正在生成')
    emit('success', orderSn)
  } catch {
    // 具体原因由请求拦截器按后端 code 弹出（18002 已抢完 / 18004 已经抢过 等）
  } finally {
    pending.value = false
  }
}
</script>

<style scoped>
.sk {
  display: flex;
  flex-direction: column;
  background: var(--mall-surface);
  border: 1px solid var(--mall-border);
  border-radius: var(--mall-radius-card);
  overflow: hidden;
  transition:
    box-shadow 0.2s,
    transform 0.2s;
}

.sk:hover {
  box-shadow: var(--mall-shadow-hover);
  transform: translateY(-2px);
}

.sk__media {
  position: relative;
  aspect-ratio: 1 / 1;
  background: var(--mall-bg);
  cursor: pointer;
}

.sk__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.sk__img--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--mall-text-weak);
  font-size: 12px;
}

.sk__badge {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 2px 8px;
  border-radius: var(--mall-radius-pill);
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 12px;
}

.sk__body {
  padding: 10px 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sk__title {
  margin: 0;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.4;
  color: var(--mall-text);
  cursor: pointer;
  /* 标题固定两行，卡片高度才不会参差 */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 2.8em;
}

.sk__price {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.sk__now {
  font-size: 18px;
  font-weight: 600;
  color: var(--mall-primary);
  font-variant-numeric: tabular-nums;
}

.sk__was {
  font-size: 12px;
  color: var(--mall-text-weak);
}

.sk__meta {
  display: flex;
  gap: 12px;
  margin: 0;
  font-size: 12px;
  color: var(--mall-text-weak);
}

.sk__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 2px;
}

.sk__clock {
  font-size: 12px;
  color: var(--mall-text-secondary);
  font-variant-numeric: tabular-nums;
}
</style>
