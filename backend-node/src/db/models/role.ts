import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../sequelize';

export class Role extends Model<InferAttributes<Role>, InferCreationAttributes<Role>> {
  declare id: CreationOptional<number>;
  declare code: string;
  declare name: string;
  declare description: string | null;
  declare level: number;
  declare is_system: number;
  declare permissions: string | string[];
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

Role.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    code: { type: DataTypes.STRING(50), allowNull: false },
    name: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    level: { type: DataTypes.INTEGER, allowNull: false },
    is_system: { type: DataTypes.BOOLEAN, allowNull: false },
    permissions: { type: DataTypes.JSON, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'roles',
  }
);
