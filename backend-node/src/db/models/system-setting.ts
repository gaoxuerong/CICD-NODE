import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../sequelize';

export class SystemSetting extends Model<InferAttributes<SystemSetting>, InferCreationAttributes<SystemSetting>> {
  declare id: CreationOptional<number>;
  declare key: string;
  declare value: string;
  declare updated_at: CreationOptional<Date>;
}

SystemSetting.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    key: { type: DataTypes.STRING(100), allowNull: false },
    value: { type: DataTypes.TEXT, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'system_settings',
  }
);
