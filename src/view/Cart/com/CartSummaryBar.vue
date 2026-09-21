<template>
  <div class="bar">
    <div class="bar__left">
      <el-checkbox :model-value="allChecked" :disabled="disabled" @change="onCheckAll">
        全选
      </el-checkbox>
      <el-button
        type="danger"
        text
        :disabled="disabled || checkedTypeCount === 0"
        @click="emit('removeChecked')"
      >
        删除选中
      </el-button>
    </div>

    <div class="bar__right">
      <!-- 显示"种"而不是"件"：后端只给了整车的总件数，勾选项的件数得自己加；
           而金额是后端算的、前端不该自己算。为了不混着来，这里用种类数。 -->
      <span class="bar__count">
        已选 <b>{{ checkedTypeCount }}</b> 种商品
      </span>
      <span class="bar__amount">
        合计：<b>¥{{ totalAmount.toFixed(2) }}</b>
      </span>
      <el-button
        type="primary"
        size="large"
        :disabled="disabled || checkedTypeCount === 0"
        @click="emit('checkout')"
      >
        去结算
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElButton, ElCheckbox } from 'element-plus'

/**
 * 购物车底部结算条。
 *
 * 是纯展示组件（只 emit，不碰 store）：全选和删除选中都需要整车信息，
 * 由页面处理；这里专注把数据摆出来。
 */
defineProps<{
  allChecked: boolean
  /** 已勾选的商品**种类数** */
  checkedTypeCount: number
  /** 应付总价，后端算好的 */
  totalAmount: number
  disabled: boolean
}>()

const emit = defineEmits<{
  checkAll: [checked: boolean]
  removeChecked: []
  checkout: []
}>()

function onCheckAll(value: boolean | string | number): void {
  emit('checkAll', value === true)
}
</script>

<style scoped>
.bar {
  position: sticky;
  bottom: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 20px;
  background: var(--mall-surface);
  border: 1px solid var(--mall-border);
  border-radius: var(--mall-radius-card);
  box-shadow: var(--mall-shadow-hover);
}

.bar__left,
.bar__right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.bar__count,
.bar__amount {
  font-size: 14px;
  color: var(--mall-text-secondary);
}

.bar__count b,
.bar__amount b {
  color: var(--mall-primary);
  font-variant-numeric: tabular-nums;
}

.bar__amount b {
  font-size: 20px;
  font-weight: 600;
}
</style>
