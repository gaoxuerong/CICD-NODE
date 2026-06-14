import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../sequelize';

export class AuditLog extends Model<InferAttributes<AuditLog>, InferCreationAttributes<AuditLog>> {
  declare id: CreationOptional<number>;
  declare user_id: number | null;
  declare username: string | null;
  declare action: string;
  declare target_type: string | null;
  declare target_name: string | null;
  declare ip: string | null;
  declare details: string | null;
  declare created_at: CreationOptional<Date>;
}

AuditLog.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    username: { type: DataTypes.STRING(255), allowNull: true },
    action: { type: DataTypes.STRING(100), allowNull: false },
    target_type: { type: DataTypes.STRING(50), allowNull: true },
    target_name: { type: DataTypes.STRING(255), allowNull: true },
    ip: { type: DataTypes.STRING(50), allowNull: true },
    details: { type: DataTypes.TEXT, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'audit_logs',
  }
);
