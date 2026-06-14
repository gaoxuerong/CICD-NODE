import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../sequelize';

export class Permission extends Model<InferAttributes<Permission>, InferCreationAttributes<Permission>> {
  declare id: CreationOptional<number>;
  declare code: string;
  declare name: string;
  declare resource: string;
  declare action: string;
  declare description: string | null;
  declare created_at: CreationOptional<Date>;
}

Permission.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    code: { type: DataTypes.STRING(100), allowNull: false },
    name: { type: DataTypes.STRING(100), allowNull: false },
    resource: { type: DataTypes.STRING(100), allowNull: false },
    action: { type: DataTypes.STRING(50), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'permissions',
  }
);
