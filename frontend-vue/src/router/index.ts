import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/pages/Login/index.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/',
    component: MainLayout,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/pages/Dashboard/index.vue'),
        meta: { title: '仪表盘', permission: 'dashboard.view' },
      },
      {
        path: 'projects',
        name: 'Projects',
        component: () => import('@/pages/Projects/index.vue'),
        meta: { title: '项目', permission: 'projects.view' },
      },
      {
        path: 'projects/:id',
        name: 'ProjectDetail',
        component: () => import('@/pages/Projects/detail.vue'),
        meta: { title: '项目详情', permission: 'projects.view' },
      },
      {
        path: 'projects/:projectId/members',
        name: 'ProjectMembers',
        component: () => import('@/pages/Projects/members.vue'),
        meta: { title: '成员管理', permission: 'projects.view' },
      },
      {
        path: 'pipelines',
        name: 'Pipelines',
        component: () => import('@/pages/Pipelines/index.vue'),
        meta: { title: '流水线', permission: 'pipelines.view' },
      },
      {
        path: 'pipelines/create',
        name: 'PipelineCreate',
        component: () => import('@/pages/Pipelines/create.vue'),
        meta: { title: '创建流水线', permission: 'pipelines.view' },
      },
      {
        path: 'pipelines/:id',
        name: 'PipelineDetail',
        component: () => import('@/pages/Pipelines/detail.vue'),
        meta: { title: '流水线详情', permission: 'pipelines.view' },
      },
      {
        path: 'pipelines/:id/edit',
        name: 'PipelineEdit',
        component: () => import('@/pages/Pipelines/edit.vue'),
        meta: { title: '编辑流水线', permission: 'pipelines.view' },
      },
      {
        path: 'builds',
        name: 'Builds',
        component: () => import('@/pages/Builds/index.vue'),
        meta: { title: '构建', permission: 'builds.view' },
      },
      {
        path: 'builds/:id',
        name: 'BuildDetail',
        component: () => import('@/pages/Builds/detail.vue'),
        meta: { title: '构建详情', permission: 'builds.view' },
      },
      {
        path: 'environments',
        name: 'Environments',
        component: () => import('@/pages/Environments/index.vue'),
        meta: { title: '环境', permission: 'environments.view' },
      },
      {
        path: 'notifications',
        name: 'Notifications',
        component: () => import('@/pages/Notifications/index.vue'),
        meta: { title: '通知' },
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/pages/Profile/index.vue'),
        meta: { title: '个人中心' },
      },
      {
        path: 'help',
        name: 'Help',
        component: () => import('@/pages/Help/index.vue'),
        meta: { title: '帮助中心' },
      },
      {
        path: 'system/settings',
        name: 'SystemSettings',
        component: () => import('@/pages/System/Settings.vue'),
        meta: { title: '系统配置', permission: 'settings.manage' },
      },
      {
        path: 'system/audit-logs',
        name: 'SystemAuditLogs',
        component: () => import('@/pages/System/AuditLogs.vue'),
        meta: { title: '审计日志', permission: 'audit.view' },
      },
      {
        path: 'system/users',
        name: 'SystemUsers',
        component: () => import('@/pages/System/Users.vue'),
        meta: { title: '用户管理', permission: 'users.manage' },
      },
      {
        path: 'system/roles',
        name: 'SystemRoles',
        component: () => import('@/pages/System/Roles.vue'),
        meta: { title: '角色管理', permission: 'roles.manage' },
      },
      {
        path: 'system/permissions',
        name: 'SystemPermissions',
        component: () => import('@/pages/System/Permissions.vue'),
        meta: { title: '权限管理', permission: 'permissions.manage' },
      },
      {
        path: 'system/git-credentials',
        name: 'SystemGitCredentials',
        component: () => import('@/pages/System/GitCredentials.vue'),
        meta: { title: 'Git 凭据', permission: 'git.manage' },
      },
      {
        path: '/:pathMatch(.*)*',
        name: 'NotFound',
        component: () => import('@/pages/NotFound/index.vue'),
        meta: { title: '页面不存在', requiresAuth: false },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('cicd_token')

  if (to.meta.requiresAuth !== false && !token) {
    next({ path: '/login', query: { redirect: to.fullPath } })
  } else if (to.path === '/login' && token) {
    next({ path: '/dashboard' })
  } else {
    // Permission check for routes that require a specific permission
    const requiredPermission = to.meta.permission as string | undefined
    if (requiredPermission && token) {
      const stored = localStorage.getItem('cicd_permissions')
      const userPermissions: string[] = stored ? JSON.parse(stored) : []
      if (!userPermissions.includes('*') && !userPermissions.includes(requiredPermission)) {
        // Avoid infinite redirect loop: if already heading to a safe page, just proceed
        if (to.path === '/help' || to.path === '/profile' || to.path === '/notifications') {
          next()
        } else {
          next({ path: '/help' })
        }
        return
      }
    }
    next()
  }
})

export default router
