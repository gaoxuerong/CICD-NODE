import { sequelize } from './sequelize';
import { DataTypes, Op } from 'sequelize';
import { Build, Environment, Pipeline, Project, ProjectMember, Role, SystemSetting, User } from './models';

async function ensureProjectGitCredentialColumn() {
  const queryInterface = sequelize.getQueryInterface();
  const table = await queryInterface.describeTable('projects');

  if (!table.git_credential_id) {
    await queryInterface.addColumn('projects', 'git_credential_id', {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'git_credentials',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  }
}

async function ensureEnvironmentReferenceColumns() {
  const queryInterface = sequelize.getQueryInterface();
  const pipelineTable = await queryInterface.describeTable('pipelines');
  const buildTable = await queryInterface.describeTable('builds');

  if (!pipelineTable.environment_id) {
    await queryInterface.addColumn('pipelines', 'environment_id', {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'environments',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  }

  if (!buildTable.environment_id) {
    await queryInterface.addColumn('builds', 'environment_id', {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'environments',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  }

  if (!buildTable.notified_status) {
    await queryInterface.addColumn('builds', 'notified_status', {
      type: DataTypes.STRING(50),
      allowNull: true,
    });
  }
}

async function removeViewerRole() {
  await User.update({ role: 'user' }, { where: { role: 'viewer' } });
  await Role.destroy({ where: { code: 'viewer' } });
}

async function removeGuestProjectRole() {
  await ProjectMember.update({ role: 'developer' }, { where: { role: 'guest' } });
}

async function normalizeProjectMemberRoles() {
  await ProjectMember.update(
    { role: 'developer' },
    {
      where: {
        role: { [Op.notIn]: ['owner', 'maintainer', 'developer'] },
      },
    }
  );
}

const DEFAULT_ENVIRONMENTS = [
  { name: '开发环境', type: 'development', description: '用于日常开发联调。' },
  { name: '测试环境', type: 'testing', description: '用于功能测试和回归验证。' },
  { name: '生产环境', type: 'production', description: '面向真实用户的生产环境。' },
];

function parsePermissions(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }

  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

async function ensureDefaultProjectEnvironments() {
  const projects = await Project.findAll({ attributes: ['id', 'created_by'], raw: true });

  for (const project of projects) {
    for (const env of DEFAULT_ENVIRONMENTS) {
      const exists = await Environment.findOne({
        where: { project_id: project.id, type: env.type },
        attributes: ['id'],
        raw: true,
      });

      if (!exists) {
        await Environment.create({
          name: env.name,
          type: env.type,
          project_id: project.id,
          deploy_url: null,
          description: env.description,
          status: 'active',
          created_by: project.created_by ?? null,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    }
  }
}

async function ensureEnvironmentProjectTypeIndex() {
  const queryInterface = sequelize.getQueryInterface();
  const indexes = await queryInterface.showIndex('environments') as Array<{ name: string }>;
  const exists = indexes.some((index) => index.name === 'uniq_environments_project_type');

  if (!exists) {
    await queryInterface.addIndex('environments', ['project_id', 'type'], {
      name: 'uniq_environments_project_type',
      unique: true,
    });
  }
}

async function ensureProjectNameIndex() {
  const queryInterface = sequelize.getQueryInterface();
  const indexes = await queryInterface.showIndex('projects') as Array<{ name: string }>;
  const exists = indexes.some((index) => index.name === 'uniq_projects_name');

  if (!exists) {
    await queryInterface.addIndex('projects', ['name'], {
      name: 'uniq_projects_name',
      unique: true,
    });
  }
}

function projectRoleRank(role: string) {
  if (role === 'owner') return 3;
  if (role === 'maintainer') return 2;
  if (role === 'developer') return 1;
  return 0;
}

async function dedupeProjectMembers() {
  const members = await ProjectMember.findAll({
    attributes: ['id', 'project_id', 'user_id', 'role', 'joined_at'],
    order: [['id', 'ASC']],
  });

  const byProjectUser = new Map<string, ProjectMember[]>();
  for (const member of members) {
    const key = `${member.project_id}:${member.user_id}`;
    byProjectUser.set(key, [...(byProjectUser.get(key) ?? []), member]);
  }

  for (const group of byProjectUser.values()) {
    if (group.length <= 1) continue;

    const keeper = [...group].sort((a, b) => {
      const rankDiff = projectRoleRank(b.role) - projectRoleRank(a.role);
      return rankDiff || a.id - b.id;
    })[0];
    const removeIds = group.filter((member) => member.id !== keeper.id).map((member) => member.id);

    await ProjectMember.destroy({ where: { id: { [Op.in]: removeIds } } });
  }
}

async function backfillProjectOwners() {
  const projects = await Project.findAll({
    attributes: ['id', 'created_by'],
    raw: true,
  });

  for (const project of projects) {
    if (!project.created_by) continue;

    const owner = await ProjectMember.findOne({
      where: { project_id: project.id, role: 'owner' },
      attributes: ['id'],
      raw: true,
    });
    if (owner) continue;

    const creatorMember = await ProjectMember.findOne({
      where: { project_id: project.id, user_id: project.created_by },
    });

    if (creatorMember) {
      await creatorMember.update({ role: 'owner' });
    } else {
      await ProjectMember.create({
        project_id: project.id,
        user_id: project.created_by,
        role: 'owner',
        joined_at: new Date(),
      });
    }
  }
}

async function ensureProjectMemberUniqueIndex() {
  const queryInterface = sequelize.getQueryInterface();
  const indexes = await queryInterface.showIndex('project_members') as Array<{ name: string }>;
  const exists = indexes.some((index) => index.name === 'uniq_project_members_project_user');

  if (!exists) {
    await queryInterface.addIndex('project_members', ['project_id', 'user_id'], {
      name: 'uniq_project_members_project_user',
      unique: true,
    });
  }
}

async function ensureSystemSettingKeyIndex() {
  const queryInterface = sequelize.getQueryInterface();
  const indexes = await queryInterface.showIndex('system_settings') as Array<{ name: string }>;
  const exists = indexes.some((index) => index.name === 'uniq_system_settings_key');

  if (!exists) {
    const rows = await sequelize.query(
      'SELECT id, `key`, updated_at FROM system_settings ORDER BY `key`, updated_at DESC, id DESC',
      { type: 'SELECT' }
    ) as Array<{ id: number; key: string; updated_at: Date }>;
    const seen = new Set<string>();
    const duplicateIds: number[] = [];

    for (const row of rows) {
      if (seen.has(row.key)) {
        duplicateIds.push(row.id);
      } else {
        seen.add(row.key);
      }
    }

    if (duplicateIds.length > 0) {
      await SystemSetting.destroy({ where: { id: { [Op.in]: duplicateIds } } });
    }

    await queryInterface.addIndex('system_settings', ['key'], {
      name: 'uniq_system_settings_key',
      unique: true,
    });
  }
}

async function ensureManagerGitViewOnlyPermission() {
  const manager = await Role.findOne({ where: { code: 'manager' } });
  if (!manager) return;

  const permissions = parsePermissions(manager.permissions);
  const nextPermissions = Array.from(new Set([
    ...permissions.filter((permission) => ![
      'projects.manage',
      'pipelines.create',
      'pipelines.manage',
      'builds.trigger',
      'builds.manage',
      'git.manage',
    ].includes(permission)),
    'git.view',
  ]));

  if (JSON.stringify(nextPermissions) !== JSON.stringify(permissions)) {
    await manager.update({
      permissions: JSON.stringify(nextPermissions),
      updated_at: new Date(),
    });
  }
}

async function ensureDeveloperProjectViewOnlyPermissions() {
  const developer = await Role.findOne({ where: { code: 'developer' } });
  if (!developer) return;

  const permissions = parsePermissions(developer.permissions);
  const nextPermissions = permissions.filter((permission) => ![
    'pipelines.create',
    'pipelines.manage',
    'builds.trigger',
    'builds.manage',
  ].includes(permission));

  if (JSON.stringify(nextPermissions) !== JSON.stringify(permissions)) {
    await developer.update({
      permissions: JSON.stringify(nextPermissions),
      updated_at: new Date(),
    });
  }
}

async function backfillPipelineAndBuildEnvironments() {
  const pipelines = await Pipeline.findAll({
    where: { environment_id: null },
    attributes: ['id', 'project_id'],
    raw: true,
  });

  for (const pipeline of pipelines) {
    const env = await Environment.findOne({
      where: { project_id: pipeline.project_id, type: 'production' },
      attributes: ['id'],
      raw: true,
    });

    if (env) {
      await Pipeline.update({ environment_id: env.id, updated_at: new Date() }, { where: { id: pipeline.id } });
    }
  }

  const builds = await Build.findAll({
    where: { environment_id: null },
    attributes: ['id', 'pipeline_id', 'project_id'],
    raw: true,
  });

  for (const build of builds) {
    let environmentId: number | null = null;

    if (build.pipeline_id) {
      const pipeline = await Pipeline.findByPk(build.pipeline_id, { attributes: ['environment_id'], raw: true });
      environmentId = pipeline?.environment_id ?? null;
    }

    if (!environmentId) {
      const env = await Environment.findOne({
        where: { project_id: build.project_id, type: 'production' },
        attributes: ['id'],
        raw: true,
      });
      environmentId = env?.id ?? null;
    }

    if (environmentId) {
      await Build.update({ environment_id: environmentId }, { where: { id: build.id } });
    }
  }
}

export async function migrate() {
  await sequelize.sync({ alter: false });
  await ensureProjectGitCredentialColumn();
  await ensureEnvironmentReferenceColumns();
  await removeViewerRole();
  await removeGuestProjectRole();
  await normalizeProjectMemberRoles();
  await dedupeProjectMembers();
  await backfillProjectOwners();
  await ensureProjectMemberUniqueIndex();
  await ensureSystemSettingKeyIndex();
  await ensureManagerGitViewOnlyPermission();
  await ensureDeveloperProjectViewOnlyPermissions();
  await ensureDefaultProjectEnvironments();
  await ensureEnvironmentProjectTypeIndex();
  await ensureProjectNameIndex();
  await backfillPipelineAndBuildEnvironments();
  console.log('Migration complete.');
}
