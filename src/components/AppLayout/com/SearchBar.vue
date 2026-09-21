<template>
  <div class="search-bar">
    <el-input
      v-model="input"
      placeholder="搜索商品、品牌、关键词"
      size="large"
      clearable
      @keyup.enter="submit"
    >
      <template #append>
        <el-button type="primary" @click="submit">搜索</el-button>
      </template>
    </el-input>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElButton, ElInput } from 'element-plus'

const route = useRoute()
const router = useRouter()

/** 输入框的值从 URL 回显 —— URL 才是筛选条件的唯一真相 */
function keywordFromRoute(): string {
  const keyword = route.query.keyword
  return typeof keyword === 'string' ? keyword : ''
}

const input = ref(keywordFromRoute())

// 用户点浏览器后退时，输入框要跟着 URL 变
watch(
  () => route.query.keyword,
  () => {
    input.value = keywordFromRoute()
  },
)

function submit(): void {
  const keyword = input.value.trim()
  if (keyword === keywordFromRoute()) {
    // 内容没变就别跳，否则 vue-router 会报重复导航
    return
  }
  // 换关键字是一次全新的检索：只带 keyword，丢掉原来的分类和筛选条件
  void router.push({ name: 'search', query: keyword ? { keyword } : {} })
}
</script>

<style scoped>
.search-bar {
  padding: 16px 0;
  max-width: 640px;
}
</style>
