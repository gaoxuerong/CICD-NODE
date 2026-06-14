<template>
  <el-container class="main-layout">
    <el-aside width="200px" class="main-layout__aside">
      <div class="main-layout__logo">
        <div class="logo-icon">CI</div>
        <span class="logo-text">CI/CD 平台</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        background-color="#001529"
        text-color="#ffffffa6"
        active-text-color="#ffffff"
        router
      >
        <template v-for="item in filteredMenuItems" :key="item.key">
          <el-sub-menu v-if="item.children" :index="item.key">
            <template #title>
              <el-icon><component :is="item.icon" /></el-icon>
              <span>{{ item.label }}</span>
            </template>
            <el-menu-item
              v-for="child in item.children"
              :key="child.key"
              :index="child.key"
            >
              <el-icon><component :is="child.icon" /></el-icon>
              <span>{{ child.label }}</span>
            </el-menu-item>
          </el-sub-menu>
          <el-menu-item v-else :index="item.key">
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ item.label }}</span>
          </el-menu-item>
        </template>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="main-layout__header">
        <div class="main-layout__breadcrumb">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/dashboard' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item v-for="item in breadcrumbItems" :key="item.path">
              {{ item.title }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="main-layout__header-right">
          <el-badge :value="0" :max="99" class="notification-badge">
            <el-button :icon="Bell" circle size="small" @click="router.push('/notifications')" />
          </el-badge>
          <el-dropdown trigger="click" @command="handleCommand">
            <span class="user-dropdown">
              <el-avatar :src="userStore.userInfo?.avatar" :size="32">
                <el-icon><User /></el-icon>
              </el-avatar>
              <span class="username">{{ userStore.userInfo?.nickname || userStore.userInfo?.username }}</span>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人中心</el-dropdown-item>
                <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="main-layout__content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Bell, User, Setting, Document, UserFilled } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const activeMenu = computed(() => route.path)

interface MenuItem {
  key: string
  icon?: any
  label: string
  permission?: string
  children?: MenuItem[]
}

const allMenuItems: MenuItem[] = [
  { key: '/dashboard', icon: 'DataBoard', label: '仪表盘', permission: 'dashboard.view' },
  { key: '/projects', icon: 'FolderOpened', label: '项目', permission: 'projects.view' },
  { key: '/pipelines', icon: 'Connection', label: '流水线', permission: 'pipelines.view' },
  { key: '/builds', icon: 'Box', label: '构建', permission: 'builds.view' },
  { key: '/environments', icon: 'Monitor', label: '环境', permission: 'environments.view' },
  {
    key: 'system',
    icon: 'Setting',
    label: '系统设置',
    children: [
      { key: '/system/settings', icon: 'Setting', label: '系统配置', permission: 'settings.manage' },
      { key: '/system/audit-logs', icon: 'Document', label: '审计日志', permission: 'audit.view' },
      { key: '/system/users', icon: 'UserFilled', label: '用户管理', permission: 'users.manage' },
      { key: '/system/roles', icon: 'Avatar', label: '角色管理', permission: 'roles.manage' },
      { key: '/system/permissions', icon: 'Lock', label: '权限管理', permission: 'permissions.manage' },
      { key: '/system/git-credentials', icon: 'Key', label: 'Git 凭据', permission: 'git.manage' },
    ],
  },
  { key: '/help', icon: 'QuestionFilled', label: '帮助中心' },
]

const filteredMenuItems = computed(() => {
  return allMenuItems
    .filter(item => {
      if (item.children) return true
      return !item.permission || userStore.hasPermission(item.permission)
    })
    .map(item => {
      if (item.children) {
        const filteredChildren = item.children.filter(
          child => !child.permission || userStore.hasPermission(child.permission)
        )
        if (filteredChildren.length === 0) return null
        return { ...item, children: filteredChildren }
      }
      return item
    })
    .filter(Boolean) as MenuItem[]
})

const labelMap: Record<string, string> = {
  dashboard: '仪表盘',
  projects: '项目',
  pipelines: '流水线',
  builds: '构建',
  environments: '环境',
  notifications: '通知',
  profile: '个人中心',
  help: '帮助中心',
  system: '系统设置',
  settings: '系统配置',
  'audit-logs': '审计日志',
  users: '用户管理',
  roles: '角色管理',
  permissions: '权限管理',
  'git-credentials': 'Git 凭据',
}

const breadcrumbItems = computed(() => {
  const pathSnippets = route.path.split('/').filter(i => i)
  return pathSnippets
    .slice(1)
    .map((snippet, index) => ({
      path: '/' + pathSnippets.slice(0, index + 2).join('/'),
      title: labelMap[snippet] || snippet,
    }))
})

const handleCommand = (command: string) => {
  if (command === 'profile') {
    router.push('/profile')
  } else if (command === 'logout') {
    userStore.logout()
  }
}
</script>

<style scoped>
.main-layout {
  height: 100vh;
}

.main-layout__aside {
  background-color: #001529;
  overflow-y: auto;
}

.main-layout__logo {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.logo-icon {
  width: 32px;
  height: 32px;
  background: #1890ff;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: bold;
  font-size: 18px;
}

.logo-text {
  color: #fff;
  font-size: 16px;
  font-weight: 500;
}

.main-layout__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  padding: 0 16px;
}

.main-layout__header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-dropdown {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.username {
  font-size: 14px;
}

.main-layout__content {
  margin: 16px;
  background: #fff;
  border-radius: 8px;
  padding: 24px;
}

.notification-badge {
  cursor: pointer;
}
</style>
