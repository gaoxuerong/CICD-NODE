import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../sequelize';

export class TokenBlacklist extends Model<InferAttributes<TokenBlacklist>, InferCreationAttributes<TokenBlacklist>> {
  declare id: CreationOptional<number>;
  declare token: string;
  declare user_id: number | null;
  declare created_at: CreationOptional<Date>;
}

TokenBlacklist.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    token: { type: DataTypes.TEXT, allowNull: false },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'token_blacklist',
  }
);
