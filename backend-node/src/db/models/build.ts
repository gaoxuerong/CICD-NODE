import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../sequelize';

export class Build extends Model<InferAttributes<Build>, InferCreationAttributes<Build>> {
  declare id: CreationOptional<number>;
  declare build_number: number;
  declare pipeline_id: number | null;
  declare project_id: number;
  declare environment_id: number | null;
  declare branch: string | null;
  declare commit_sha: string | null;
  declare commit_message: string | null;
  declare status: string;
  declare trigger_by: number | null;
  declare duration: number | null;
  declare logs: string | null;
  declare started_at: Date | null;
  declare finished_at: Date | null;
  declare github_run_id: number | null;
  declare github_run_url: string | null;
  declare github_workflow_id: string | null;
  declare github_workflow_name: string | null;
  declare notified_status: string | null;
  declare created_at: CreationOptional<Date>;
}

Build.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    build_number: { type: DataTypes.INTEGER, allowNull: false },
    pipeline_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    project_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    environment_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    branch: { type: DataTypes.STRING(100), allowNull: true },
    commit_sha: { type: DataTypes.STRING(50), allowNull: true },
    commit_message: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.STRING(50), allowNull: false },
    trigger_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    duration: { type: DataTypes.INTEGER, allowNull: true },
    logs: { type: DataTypes.TEXT('long'), allowNull: true },
    started_at: { type: DataTypes.DATE, allowNull: true },
    finished_at: { type: DataTypes.DATE, allowNull: true },
    github_run_id: { type: DataTypes.BIGINT, allowNull: true },
    github_run_url: { type: DataTypes.STRING(500), allowNull: true },
    github_workflow_id: { type: DataTypes.STRING(100), allowNull: true },
    github_workflow_name: { type: DataTypes.STRING(255), allowNull: true },
    notified_status: { type: DataTypes.STRING(50), allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'builds',
  }
);
