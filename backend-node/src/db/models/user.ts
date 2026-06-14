import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../sequelize';

export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare id: CreationOptional<number>;
  declare username: string;
  declare email: string;
  declare nickname: string | null;
  declare password_hash: string;
  declare avatar: string | null;
  declare role: string;
  declare status: string;
  declare is_superuser: number;
  declare last_login_at: Date | null;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

User.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    username: { type: DataTypes.STRING(255), allowNull: false },
    email: { type: DataTypes.STRING(255), allowNull: false },
    nickname: { type: DataTypes.STRING(255), allowNull: true },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    avatar: { type: DataTypes.STRING(500), allowNull: true },
    role: { type: DataTypes.STRING(50), allowNull: false },
    status: { type: DataTypes.STRING(50), allowNull: false },
    is_superuser: { type: DataTypes.BOOLEAN, allowNull: false },
    last_login_at: { type: DataTypes.DATE, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'users',
  }
);
