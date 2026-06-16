import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../sequelize';

export class Project extends Model<InferAttributes<Project>, InferCreationAttributes<Project>> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare description: string | null;
  declare repositoryUrl: string | null;
  declare language: string | null;
  declare status: string;
  declare source: string;
  declare git_credential_id: number | null;
  declare github_owner: string | null;
  declare github_repo: string | null;
  declare default_branch: string | null;
  declare last_sync_at: Date | null;
  declare created_by: number | null;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

Project.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    repositoryUrl: { type: DataTypes.STRING(500), allowNull: true, field: 'git_url' },
    language: { type: DataTypes.STRING(50), allowNull: true },
    status: { type: DataTypes.STRING(50), allowNull: false },
    source: { type: DataTypes.STRING(50), allowNull: false },
    git_credential_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    github_owner: { type: DataTypes.STRING(255), allowNull: true },
    github_repo: { type: DataTypes.STRING(255), allowNull: true },
    default_branch: { type: DataTypes.STRING(100), allowNull: true, field: 'github_default_branch' },
    last_sync_at: { type: DataTypes.DATE, allowNull: true },
    created_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'projects',
    indexes: [
      {
        unique: true,
        fields: ['name'],
        name: 'uniq_projects_name',
      },
    ],
  }
);
