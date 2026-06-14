import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../sequelize';

export class Project extends Model<InferAttributes<Project>, InferCreationAttributes<Project>> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare description: string | null;
  declare git_url: string | null;
  declare language: string | null;
  declare status: string;
  declare source: string;
  declare github_owner: string | null;
  declare github_repo: string | null;
  declare github_default_branch: string | null;
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
    git_url: { type: DataTypes.STRING(500), allowNull: true },
    language: { type: DataTypes.STRING(50), allowNull: true },
    status: { type: DataTypes.STRING(50), allowNull: false },
    source: { type: DataTypes.STRING(50), allowNull: false },
    github_owner: { type: DataTypes.STRING(255), allowNull: true },
    github_repo: { type: DataTypes.STRING(255), allowNull: true },
    github_default_branch: { type: DataTypes.STRING(100), allowNull: true },
    last_sync_at: { type: DataTypes.DATE, allowNull: true },
    created_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'projects',
  }
);
