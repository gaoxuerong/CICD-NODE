import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../sequelize';

export class Environment extends Model<InferAttributes<Environment>, InferCreationAttributes<Environment>> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare type: string;
  declare project_id: number;
  declare deploy_url: string | null;
  declare description: string | null;
  declare status: string;
  declare created_by: number | null;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

Environment.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    type: { type: DataTypes.STRING(50), allowNull: false },
    project_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    deploy_url: { type: DataTypes.STRING(500), allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.STRING(50), allowNull: false },
    created_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'environments',
    indexes: [
      {
        unique: true,
        fields: ['project_id', 'type'],
        name: 'uniq_environments_project_type',
      },
    ],
  }
);
