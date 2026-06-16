import { Op } from 'sequelize';
import { ProjectMember } from '../db/models';
import { AuthUser } from './types';

export type ProjectRole = 'owner' | 'maintainer' | 'developer' | null;
export type ProjectAction = 'view' | 'edit' | 'delete' | 'manageMembers' | 'managePipelines' | 'triggerBuild';

export function isPlatformAdmin(user: AuthUser): boolean {
  return Boolean(user.is_superuser) || user.role === 'superadmin' || user.role === 'admin';
}

export async function getProjectRole(userId: number, projectId: number | string): Promise<ProjectRole> {
  const member = await ProjectMember.findOne({
    where: { project_id: projectId, user_id: userId },
    attributes: ['role'],
    raw: true,
  });

  if (!member) return null;
  if (member.role === 'owner' || member.role === 'maintainer' || member.role === 'developer') {
    return member.role;
  }
  return null;
}

export async function getAccessibleProjectIds(user: AuthUser): Promise<number[] | null> {
  if (isPlatformAdmin(user)) return null;

  const members = await ProjectMember.findAll({
    where: { user_id: user.id },
    attributes: ['project_id'],
    raw: true,
  });

  return members.map((member) => member.project_id);
}

export async function getProjectRolesByProjectId(user: AuthUser, projectIds: number[]): Promise<Map<number, ProjectRole>> {
  const roles = new Map<number, ProjectRole>();

  if (projectIds.length === 0) return roles;
  if (isPlatformAdmin(user)) {
    projectIds.forEach((projectId) => roles.set(projectId, 'owner'));
    return roles;
  }

  const members = await ProjectMember.findAll({
    where: {
      user_id: user.id,
      project_id: { [Op.in]: projectIds },
    },
    attributes: ['project_id', 'role'],
    raw: true,
  });

  for (const member of members) {
    roles.set(member.project_id, normalizeProjectRole(member.role));
  }

  return roles;
}

export function normalizeProjectRole(role: string | null | undefined): ProjectRole {
  if (role === 'owner' || role === 'maintainer' || role === 'developer') return role;
  return null;
}

export function buildProjectPermissions(user: AuthUser, role: ProjectRole) {
  const platformAdmin = isPlatformAdmin(user);
  const canView = platformAdmin || Boolean(role);
  const canEdit = platformAdmin || role === 'owner' || role === 'maintainer';
  const canDelete = platformAdmin || role === 'owner';
  const canManageMembers = platformAdmin || role === 'owner' || role === 'maintainer';
  const canManagePipelines = platformAdmin || role === 'owner' || role === 'maintainer';
  const canTriggerBuild = platformAdmin || role === 'owner' || role === 'maintainer' || role === 'developer';

  return {
    canView,
    canEdit,
    canDelete,
    canManageMembers,
    canManagePipelines,
    canTriggerBuild,
  };
}

export async function canAccessProject(user: AuthUser, projectId: number | string, action: ProjectAction): Promise<boolean> {
  const role = await getProjectRole(user.id, projectId);
  const permissions = buildProjectPermissions(user, role);

  if (action === 'view') return permissions.canView;
  if (action === 'edit') return permissions.canEdit;
  if (action === 'delete') return permissions.canDelete;
  if (action === 'manageMembers') return permissions.canManageMembers;
  if (action === 'managePipelines') return permissions.canManagePipelines;
  if (action === 'triggerBuild') return permissions.canTriggerBuild;

  return false;
}
