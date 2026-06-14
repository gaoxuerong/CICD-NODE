import { CreationOptional, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
export declare class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
    id: CreationOptional<number>;
    username: string;
    email: string;
    nickname: string | null;
    password_hash: string;
    avatar: string | null;
    role: string;
    status: string;
    is_superuser: number;
    last_login_at: Date | null;
    created_at: CreationOptional<Date>;
    updated_at: CreationOptional<Date>;
}
//# sourceMappingURL=user.d.ts.map