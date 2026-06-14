import { CreationOptional, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
export declare class TokenBlacklist extends Model<InferAttributes<TokenBlacklist>, InferCreationAttributes<TokenBlacklist>> {
    id: CreationOptional<number>;
    token: string;
    user_id: number | null;
    created_at: CreationOptional<Date>;
}
//# sourceMappingURL=token-blacklist.d.ts.map