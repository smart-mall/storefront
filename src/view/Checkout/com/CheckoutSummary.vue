<template>
  <div class="summary">
    <div class="summary__left">
      <span class="summary__label">支付方式</span>
      <button
        v-for="option in PAY_OPTIONS"
        :key="option.value"
        type="button"
        class="summary__pay"
        :class="{ 'summary__pay--on': option.value === payType }"
        :disabled="submitting"
        @click="emit('update:payType', option.value)"
      >
        {{ option.label }}
      </button>
    </div>

    <div class="summary__right">
      <span v-if="outOfStock" class="summary__warn">有商品缺货，无法提交</span>
      <span v-else-if="addressMissing" class="summary__warn">请先选择收货地址</span>

      <dl class="summary__amounts">
        <div class="summary__line">
          <dt>商品总额</dt>
          <dd>¥{{ totalAmount.toFixed(2) }}</dd>
        </div>
        <div class="summary__line">
          <dt>运费</dt>
          <dd>¥{{ freightAmount.toFixed(2) }}</dd>
        </div>
        <div v-if="promotionOnlyAmount > 0" class="summary__line">
          <dt>商品促销</dt>
          <dd class="summary__discount">−¥{{ promotionOnlyAmount.toFixed(2) }}</dd>
        </div>
        <div v-if="memberPriceAmount > 0" class="summary__line">
          <dt>会员价</dt>
          <dd class="summary__discount">−¥{{ memberPriceAmount.toFixed(2) }}</dd>
        </div>
        <div v-if="couponAmount > 0" class="summary__line">
          <dt>优惠券</dt>
          <dd class="summary__discount">−¥{{ couponAmount.toFixed(2) }}</dd>
        </div>
        <div v-if="integrationAmount > 0" class="summary__line">
          <dt>积分抵扣</dt>
          <dd class="summary__discount">−¥{{ integrationAmount.toFixed(2) }}</dd>
        </div>
        <div class="summary__line summary__line--total">
          <dt>{{ count }} 件商品，应付</dt>
          <dd>¥{{ payAmount.toFixed(2) }}</dd>
        </div>
      </dl>

      <p v-if="giftText" class="summary__gift">{{ giftText }}</p>

      <el-button
        type="primary"
        size="large"
        :loading="submitting"
        :disabled="!canSubmit"
        @click="emit('submit')"
      >
        提交订单
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElButton } from 'element-plus'
import type { PayType } from '@/type'

/**
 * 结算页底部汇总条。纯展示 + 上抛事件：
 * 金额全部来自后端（商品总额、运费、促销、券与积分的抵扣额），这里只负责显示和在提交时原样回传给页面。
 */
const props = defineProps<{
  totalAmount: number
  freightAmount: number
  /** 商品优惠减免额（满减、阶梯价与会员价）；一项都没命中时为 0，这时整行不显示 */
  promotionAmount: number
  /** 其中来自会员价的那块；为 0 时"会员价"这一行不显示 */
  memberPriceAmount: number
  /** 本单可得的赠送积分；与成长值都为 0 时这一行不显示 */
  giftIntegration: number
  /** 本单可得的赠送成长值 */
  giftGrowth: number
  /** 券的抵扣额；没用券时为 0，这时整行不显示 */
  couponAmount: number
  /** 积分抵扣额；没用积分时为 0，这时整行不显示 */
  integrationAmount: number
  /** 应付总额，提交时回传的就是它 */
  payAmount: number
  count: number
  payType: PayType
  submitting: boolean
  canSubmit: boolean
  outOfStock: boolean
  addressMissing: boolean
}>()

const emit = defineEmits<{
  'update:payType': [value: PayType]
  submit: []
}>()

/**
 * 赠送量文案：数值由后端按同一份算法算好，前端不做"每件可得 × 件数"的推算 ——
 * 按件数相乘后取整不是线性的，乘出来的数会与付款后到账的数差几分。
 */
const giftText = computed(() => {
  if (props.giftIntegration <= 0 && props.giftGrowth <= 0) return ''
  return `本单可得 ${props.giftIntegration} 积分、${props.giftGrowth} 成长值`
})

/**
 * "商品促销"那一行显示的数：后端只给含会员价的合计，这里减去会员价那块，避免同一笔钱显示两次。
 *
 * 只是一次展示用的减法，不参与任何金额计算 —— 应付金额取 `payAmount`。
 */
const promotionOnlyAmount = computed(() =>
  Math.max(props.promotionAmount - props.memberPriceAmount, 0),
)

/**
 * 用普通按钮而不是 el-radio：Element Plus 2.6 起 radio 的绑定属性从 `label` 换成了
 * `value`（`label` 变成显示文案），两个版本写法不兼容。这里只有固定几个选项，
 * 不值得为它去踩那个变更。
 */
const PAY_OPTIONS: { value: PayType; label: string }[] = [
  { value: 1, label: '支付宝' },
  { value: 2, label: '微信' },
  { value: 9, label: '测试支付' },
]
</script>

<style scoped>
.summary {
  position: sticky;
  bottom: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 16px 20px;
  background: var(--mall-surface);
  border: 1px solid var(--mall-border);
  border-radius: var(--mall-radius-card);
  box-shadow: var(--mall-shadow-hover);
}

.summary__left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.summary__label {
  font-size: 13px;
  color: var(--mall-text-secondary);
}

.summary__pay {
  padding: 6px 16px;
  font: inherit;
  font-size: 13px;
  color: var(--mall-text);
  background: var(--mall-surface);
  border: 1px solid var(--mall-border);
  border-radius: 8px;
  cursor: pointer;
}

.summary__pay:hover:not(:disabled) {
  border-color: var(--mall-primary);
}

.summary__pay--on {
  color: var(--mall-primary);
  border-color: var(--mall-primary);
  background: var(--mall-primary-soft);
}

.summary__pay:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.summary__right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.summary__warn {
  font-size: 13px;
  color: var(--mall-primary);
}

.summary__amounts {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.summary__line {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  font-size: 13px;
  color: var(--mall-text-secondary);
}

.summary__line dd {
  margin: 0;
  font-variant-numeric: tabular-nums;
}

/* 优惠是减项，用主色区分，与"应付"同一个色系但小一号 */
.summary__discount {
  color: var(--mall-primary);
}

/* 赠送量不是金额，用弱色，避免和应付抢注意力 */
.summary__gift {
  margin: 0;
  font-size: 13px;
  color: var(--mall-text-secondary);
}

.summary__line--total {
  font-size: 14px;
  color: var(--mall-text);
}

.summary__line--total dd {
  color: var(--mall-primary);
  font-size: 20px;
  font-weight: 600;
}
</style>
