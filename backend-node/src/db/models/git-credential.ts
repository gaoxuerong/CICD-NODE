import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../sequelize';

export class GitCredential extends Model<InferAttributes<GitCredential>, InferCreationAttributes<GitCredential>> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare type: string;
  declare username: string | null;
  declare credential: string;
  declare description: string | null;
  declare created_by: number | null;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

GitCredential.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    type: { type: DataTypes.STRING(50), allowNull: false },
    username: { type: DataTypes.STRING(255), allowNull: true },
    credential: { type: DataTypes.TEXT, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    created_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'git_credentials',
  }
);
