import { User } from './user';
import { Role } from './role';
import { Permission } from './permission';
import { InviteCode } from './invite-code';
import { TokenBlacklist } from './token-blacklist';
import { AuditLog } from './audit-log';
import { GitCredential } from './git-credential';
import { Project } from './project';
import { ProjectMember } from './project-member';
import { Pipeline } from './pipeline';
import { Build } from './build';
import { Environment } from './environment';
import { Notification } from './notification';
import { SystemSetting } from './system-setting';

Project.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
ProjectMember.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });
ProjectMember.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Pipeline.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });
Pipeline.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
Build.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });
Build.belongsTo(Pipeline, { foreignKey: 'pipeline_id', as: 'pipeline' });
Build.belongsTo(User, { foreignKey: 'trigger_by', as: 'triggerUser' });
Environment.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });
Environment.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
GitCredential.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
InviteCode.belongsTo(User, { foreignKey: 'used_by', as: 'usedByUser' });
TokenBlacklist.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

export {
  User,
  Role,
  Permission,
  InviteCode,
  TokenBlacklist,
  AuditLog,
  GitCredential,
  Project,
  ProjectMember,
  Pipeline,
  Build,
  Environment,
  Notification,
  SystemSetting,
};
