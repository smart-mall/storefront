<template>
  <footer class="footer">
    <div class="footer__inner">
      <p>谷粒商城 · 个人学习项目</p>
      <p class="footer__muted">商品、订单、检索数据均来自本地部署的演示环境</p>
    </div>
  </footer>
</template>

<script setup lang="ts"></script>

<style scoped>
.footer {
  border-top: 1px solid var(--mall-border);
  background: var(--mall-surface);
  padding: 24px 0;
  font-size: 13px;
  color: var(--mall-text-secondary);
}

.footer__inner {
  width: 100%;
  max-width: var(--mall-content-width);
  margin: 0 auto;
  padding: 0 16px;
  box-sizing: border-box;
}

.footer__inner p {
  margin: 0;
}

.footer__muted {
  margin-top: 4px;
  color: var(--mall-text-weak);
}
</style>
