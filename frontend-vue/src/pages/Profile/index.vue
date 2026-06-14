<template>
  <div>
    <h1 style="margin-bottom: 16px">个人中心</h1>

    <el-card>
      <el-form :model="form" label-width="100px" style="max-width: 500px">
        <el-form-item label="用户名">
          <el-input v-model="form.username" disabled />
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="form.nickname" placeholder="请输入昵称" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="form.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSave" :loading="saving">保存</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { authApi } from '@/api/auth'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const saving = ref(false)

const form = reactive({
  username: '',
  nickname: '',
  email: '',
})

onMounted(async () => {
  try {
    const res = await authApi.getProfile()
    if (res.data.code === 0) {
      const info = res.data.data
      form.username = info.username || ''
      form.nickname = info.nickname || ''
      form.email = info.email || ''
    }
  } catch {
    // ignore
  }
})

const handleSave = async () => {
  saving.value = true
  try {
    const res = await authApi.updateProfile({
      nickname: form.nickname,
      email: form.email,
    })
    if (res.data.code === 0) {
      ElMessage.success('保存成功')
      userStore.fetchUserInfo()
    }
  } catch {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}
</script>
