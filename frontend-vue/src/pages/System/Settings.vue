<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
      <h1>系统配置</h1>
      <el-button type="primary" :loading="saving" @click="handleSave">保存配置</el-button>
    </div>

    <el-card v-loading="loading">
      <el-tabs v-model="activeGroup" tab-position="left">
        <el-tab-pane v-for="group in groups" :key="group.code" :label="group.name" :name="group.code">
          <div class="group-header">
            <h3>{{ group.name }}</h3>
            <p>{{ group.description }}</p>
            <el-button
              v-if="group.code === 'notification'"
              type="primary"
              plain
              :loading="testingEmail"
              style="margin-top: 10px"
              @click="handleTestEmail"
            >
              发送测试邮件
            </el-button>
          </div>

          <el-form label-width="170px" class="settings-form">
            <el-form-item v-for="setting in group.settings" :key="setting.key" :label="setting.label">
              <div class="setting-control">
                <el-switch
                  v-if="setting.type === 'boolean'"
                  v-model="form[setting.key]"
                  active-value="true"
                  inactive-value="false"
                />
                <el-input-number
                  v-else-if="setting.type === 'number'"
                  v-model="numberForm[setting.key]"
                  :min="0"
                  style="width: 220px"
                  @change="syncNumber(setting.key)"
                />
                <el-select
                  v-else-if="setting.type === 'select'"
                  v-model="form[setting.key]"
                  style="width: 260px"
                >
                  <el-option
                    v-for="option in setting.options || []"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  />
                </el-select>
                <el-input
                  v-else
                  v-model="form[setting.key]"
                  :type="setting.type === 'password' ? 'password' : 'text'"
                  :show-password="setting.type === 'password'"
                  :placeholder="setting.type === 'password' && setting.has_value ? '留空表示不修改' : ''"
                  style="max-width: 420px"
                />
                <el-tag v-if="setting.type === 'password' && setting.masked_value" size="small" effect="plain">
                  {{ setting.masked_value }}
                </el-tag>
                <el-tag v-if="setting.type === 'password' && setting.has_value" size="small" type="success" effect="plain">
                  已配置
                </el-tag>
                <el-tag v-if="setting.is_default" size="small" effect="plain">默认值</el-tag>
              </div>
              <div class="setting-description">{{ setting.description }}</div>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { systemApi } from '@/api/system'

const loading = ref(true)
const saving = ref(false)
const testingEmail = ref(false)
const activeGroup = ref('app')
const groups = ref<any[]>([])
const form = reactive<Record<string, string>>({})
const numberForm = reactive<Record<string, number>>({})

const syncNumber = (key: string) => {
  form[key] = String(numberForm[key] ?? 0)
}

const applyGroups = (items: any[]) => {
  groups.value = items
  if (items[0]?.code) activeGroup.value = items[0].code
  for (const group of items) {
    for (const setting of group.settings || []) {
      form[setting.key] = setting.type === 'password'
        ? ''
        : setting.value ?? setting.defaultValue ?? ''
      if (setting.type === 'number') {
        numberForm[setting.key] = Number(form[setting.key] || 0)
      }
    }
  }
}

const fetchSettings = async () => {
  loading.value = true
  try {
    const res = await systemApi.getSettings()
    if (res.data.code === 0) {
      applyGroups(res.data.data?.groups || [])
    }
  } finally {
    loading.value = false
  }
}

const handleSave = async () => {
  for (const [key, value] of Object.entries(numberForm)) {
    form[key] = String(value ?? 0)
  }

  const payload: Record<string, string> = {}
  for (const group of groups.value) {
    for (const setting of group.settings || []) {
      if (setting.type === 'password' && !form[setting.key]) continue
      payload[setting.key] = form[setting.key] ?? ''
    }
  }

  saving.value = true
  try {
    const res = await systemApi.updateSettings(payload)
    if (res.data.code === 0) {
      ElMessage.success('保存成功')
      fetchSettings()
    } else {
      ElMessage.error(res.data.message || '保存失败')
    }
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const handleTestEmail = async () => {
  testingEmail.value = true
  try {
    const res = await systemApi.sendTestEmail()
    if (res.data.code === 0) {
      ElMessage.success('测试邮件已发送')
    } else {
      ElMessage.error(res.data.message || '测试邮件发送失败')
    }
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || '测试邮件发送失败')
  } finally {
    testingEmail.value = false
  }
}

onMounted(fetchSettings)
</script>

<style scoped>
.group-header {
  margin-bottom: 18px;
}

.group-header h3 {
  margin: 0 0 6px;
}

.group-header p,
.setting-description {
  margin: 0;
  color: #909399;
  font-size: 13px;
}

.settings-form {
  max-width: 760px;
}

.setting-control {
  display: flex;
  align-items: center;
  gap: 10px;
}
</style>
