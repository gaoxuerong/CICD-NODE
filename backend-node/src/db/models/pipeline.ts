import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../sequelize';

export class Pipeline extends Model<InferAttributes<Pipeline>, InferCreationAttributes<Pipeline>> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare project_id: number;
  declare trigger_type: string;
  declare branch_filter: string | null;
  declare config: string | null;
  declare status: string;
  declare last_build_at: Date | null;
  declare created_by: number | null;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

Pipeline.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    project_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    trigger_type: { type: DataTypes.STRING(50), allowNull: false },
    branch_filter: { type: DataTypes.STRING(255), allowNull: true },
    config: { type: DataTypes.JSON, allowNull: true },
    status: { type: DataTypes.STRING(50), allowNull: false },
    last_build_at: { type: DataTypes.DATE, allowNull: true },
    created_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'pipelines',
  }
);
