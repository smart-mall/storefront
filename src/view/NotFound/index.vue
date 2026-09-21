<template>
  <div class="not-found">
    <EmptyState description="页面不存在或已被移除">
      <el-button type="primary" @click="router.push({ name: 'home' })">回首页</el-button>
    </EmptyState>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ElButton } from 'element-plus'
import EmptyState from '@/components/EmptyState/index.vue'

const router = useRouter()
</script>

<style scoped>
.not-found {
  padding-top: 16px;
}
</style>
