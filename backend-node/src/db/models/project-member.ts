import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../sequelize';

export class ProjectMember extends Model<InferAttributes<ProjectMember>, InferCreationAttributes<ProjectMember>> {
  declare id: CreationOptional<number>;
  declare project_id: number;
  declare user_id: number;
  declare role: string;
  declare joined_at: Date;
}

ProjectMember.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    project_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    role: { type: DataTypes.STRING(50), allowNull: false },
    joined_at: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'project_members',
  }
);
