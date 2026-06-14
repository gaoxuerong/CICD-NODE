import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../sequelize';

export class Notification extends Model<InferAttributes<Notification>, InferCreationAttributes<Notification>> {
  declare id: CreationOptional<number>;
  declare user_id: number;
  declare title: string;
  declare content: string | null;
  declare is_read: number;
  declare created_at: CreationOptional<Date>;
}

Notification.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    title: { type: DataTypes.STRING(255), allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: true },
    is_read: { type: DataTypes.BOOLEAN, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'notifications',
  }
);
