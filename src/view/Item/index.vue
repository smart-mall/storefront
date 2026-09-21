<template>
  <div class="placeholder">
    <EmptyState :description="`商品详情正在开发（批次 3），skuId = ${skuId}`">
      <el-button type="primary" @click="router.push({ name: 'home' })">回首页</el-button>
    </EmptyState>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElButton } from 'element-plus'
import EmptyState from '@/components/EmptyState/index.vue'

const route = useRoute()
const router = useRouter()

/** 路由参数永远是 string，这里保持原样只为展示 */
const skuId = computed(() => String(route.params.skuId ?? ''))
</script>

<style scoped>
.placeholder {
  padding-top: 16px;
}
</style>
