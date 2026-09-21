<template>
  <div class="placeholder">
    <EmptyState description="检索页正在开发（批次 2：筛选面板 + 商品列表 + 分页）">
      <el-button type="primary" @click="router.push({ name: 'home' })">回首页</el-button>
    </EmptyState>

    <!-- 临时把解析出来的条件显示出来，用来验证「条件进 URL」这条链路是通的 -->
    <div class="placeholder__debug">
      <p class="placeholder__debug-title">当前 URL 解析出的检索条件</p>
      <pre>{{ readable }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElButton } from 'element-plus'
import EmptyState from '@/components/EmptyState/index.vue'
import { useSearchQuery } from '@/composables/useSearchQuery'

const router = useRouter()
const { query } = useSearchQuery()

const readable = computed(() => JSON.stringify(query.value, null, 2))
</script>

<style scoped>
.placeholder {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 16px;
}

.placeholder__debug {
  background: var(--mall-surface);
  border: 1px solid var(--mall-border);
  border-radius: var(--mall-radius-card);
  padding: 16px;
}

.placeholder__debug-title {
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--mall-text-secondary);
}

.placeholder__debug pre {
  margin: 0;
  font-size: 13px;
  color: var(--mall-text);
  white-space: pre-wrap;
}
</style>
