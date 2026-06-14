import { CreationOptional, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
export declare class Notification extends Model<InferAttributes<Notification>, InferCreationAttributes<Notification>> {
    id: CreationOptional<number>;
    user_id: number;
    title: string;
    content: string | null;
    is_read: number;
    created_at: CreationOptional<Date>;
}
//# sourceMappingURL=notification.d.ts.map