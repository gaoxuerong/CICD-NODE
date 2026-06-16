export const permissionNameMap: Record<string, string> = {
  'dashboard.view': '查看仪表盘',
  'projects.view': '查看项目',
  'projects.create': '创建项目',
  'projects.manage': '管理项目',
  'pipelines.view': '查看流水线',
  'pipelines.create': '创建流水线',
  'pipelines.manage': '管理流水线',
  'builds.view': '查看构建',
  'builds.trigger': '触发构建',
  'builds.manage': '管理构建',
  'users.view': '查看用户',
  'users.manage': '管理用户',
  'roles.view': '查看角色',
  'roles.manage': '管理角色',
  'settings.view': '查看设置',
  'settings.manage': '管理设置',
  'environments.view': '查看环境',
  'environments.manage': '管理环境',
  'notifications.view': '查看通知',
  'audit.view': '查看审计日志',
  'permissions.view': '查看权限',
  'permissions.manage': '管理权限',
  'git.view': '查看 Git 凭据',
  'git.manage': '管理 Git 凭据',
}

export const permissionResourceMap: Record<string, string> = {
  dashboard: '仪表盘',
  projects: '项目',
  pipelines: '流水线',
  builds: '构建',
  users: '用户',
  roles: '角色',
  settings: '设置',
  environments: '环境',
  notifications: '通知',
  audit: '审计',
  permissions: '权限',
  git: 'Git 凭据',
}

export const permissionActionMap: Record<string, string> = {
  view: '查看',
  create: '创建',
  manage: '管理',
  trigger: '触发',
}

export function getPermissionName(permission: any): string {
  const code = typeof permission === 'string' ? permission : permission?.code
  const fallback = typeof permission === 'string' ? permission : permission?.name
  return permissionNameMap[code] || fallback || code || '-'
}

export function getPermissionResource(resource?: string): string {
  return permissionResourceMap[resource || ''] || resource || '其他'
}

export function getPermissionAction(action?: string): string {
  return permissionActionMap[action || ''] || action || '-'
}
