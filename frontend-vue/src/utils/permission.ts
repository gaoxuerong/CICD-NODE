import { useUserStore } from '@/stores/user'

export function hasPermission(userPermissions: string[], permission: string): boolean {
  if (!userPermissions || userPermissions.length === 0) {
    return false
  }
  if (userPermissions.includes('*')) {
    return true
  }
  return userPermissions.includes(permission)
}

export function getRoleName(role: string): string {
  const roleMap: Record<string, string> = {
    superadmin: '超级管理员',
    admin: '系统管理员',
    manager: '项目管理者',
    project_admin: '项目管理员',
    developer: '开发者',
    user: '普通用户',
    viewer: '访客',
    owner: '项目所有者',
    maintainer: '项目维护者',
    guest: '项目访客',
  }
  return roleMap[role] || role
}

export function isAdmin(role: string): boolean {
  return role === 'admin'
}

export function canManageProject(platformRole: string, projectRole: string): boolean {
  const adminRoles = ['admin', 'project_admin']
  const ownerRoles = ['owner', 'maintainer']
  return adminRoles.includes(platformRole) || ownerRoles.includes(projectRole)
}
