<template>
  <div class="not-found">
    <div class="not-found__content">
      <h1 class="not-found__code">404</h1>
      <p class="not-found__text">抱歉，您访问的页面不存在</p>
      <el-button type="primary" @click="router.push('/dashboard')">返回首页</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<style scoped>
.not-found {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 400px;
}

.not-found__content {
  text-align: center;
}

.not-found__code {
  font-size: 120px;
  font-weight: 700;
  color: #c0c4cc;
  line-height: 1;
  margin: 0;
}

.not-found__text {
  font-size: 18px;
  color: #909399;
  margin: 16px 0 32px;
}
</style>
