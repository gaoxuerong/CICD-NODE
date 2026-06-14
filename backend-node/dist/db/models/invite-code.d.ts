import { InferAttributes, InferCreationAttributes, Model } from 'sequelize';
export declare class InviteCode extends Model<InferAttributes<InviteCode>, InferCreationAttributes<InviteCode>> {
    id: number;
    code: string;
    used: number;
    used_by: number | null;
    created_at: Date;
    used_at: Date | null;
    expires_at: Date | null;
}
//# sourceMappingURL=invite-code.d.ts.map