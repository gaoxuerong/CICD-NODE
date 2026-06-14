<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <div class="logo">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect width="48" height="48" rx="8" fill="#1890ff"/>
            <path d="M14 24L20 30L34 16" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <h2 class="login-title">CI/CD 平台</h2>
        <p class="login-subtitle">持续集成与持续交付平台</p>
      </div>

      <el-form ref="formRef" :model="form" :rules="rules" size="large" @submit.prevent="handleSubmit">
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="用户名" prefix-icon="User" />
        </el-form-item>

        <el-form-item prop="password">
          <el-input v-model="form.password" type="password" placeholder="密码" prefix-icon="Lock" show-password />
        </el-form-item>

        <el-form-item>
          <div class="login-options">
            <el-checkbox v-model="form.remember">记住我</el-checkbox>
            <el-link type="primary">忘记密码？</el-link>
          </div>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" native-type="submit" :loading="loading" style="width: 100%">
            登录
          </el-button>
        </el-form-item>

        <div class="login-register">
          如需账号请联系管理员
        </div>
      </el-form>

      <div class="login-footer">
        © 2026 CI/CD Platform. All rights reserved.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import type { FormInstance, FormRules } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()

const formRef = ref<FormInstance>()
const loading = ref(false)

const form = reactive({
  username: '',
  password: '',
  remember: true,
})

const rules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度为 3-20 位', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' },
  ],
}

const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return

    loading.value = true
    try {
      const success = await userStore.login(form.username, form.password)
      if (success) {
        ElMessage.success('登录成功')
        router.push('/dashboard')
      } else {
        ElMessage.error('登录失败')
      }
    } catch (error) {
      ElMessage.error('登录失败，请检查用户名和密码')
    } finally {
      loading.value = false
    }
  })
}
</script>

<style scoped>
.login-card {
  width: 400px;
  padding: 40px;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-header .logo {
  margin-bottom: 16px;
}

.login-title {
  margin-bottom: 8px;
  font-weight: 600;
  color: #303133;
}

.login-subtitle {
  color: #909399;
  font-size: 14px;
}

.login-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.login-register {
  text-align: center;
  color: #909399;
  font-size: 14px;
}

.login-footer {
  text-align: center;
  margin-top: 24px;
  font-size: 12px;
  color: #909399;
}
</style>
