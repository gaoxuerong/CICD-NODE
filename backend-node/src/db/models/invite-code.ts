import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../sequelize';

export class InviteCode extends Model<InferAttributes<InviteCode>, InferCreationAttributes<InviteCode>> {
  declare id: number;
  declare code: string;
  declare used: number;
  declare used_by: number | null;
  declare created_at: Date;
  declare used_at: Date | null;
  declare expires_at: Date | null;
}

InviteCode.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    code: { type: DataTypes.STRING(50), allowNull: false },
    used: { type: DataTypes.BOOLEAN, allowNull: false },
    used_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    used_at: { type: DataTypes.DATE, allowNull: true },
    expires_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    tableName: 'invite_codes',
  }
);
