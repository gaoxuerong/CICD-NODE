import { CreationOptional, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
export declare class AuditLog extends Model<InferAttributes<AuditLog>, InferCreationAttributes<AuditLog>> {
    id: CreationOptional<number>;
    user_id: number | null;
    username: string | null;
    action: string;
    target_type: string | null;
    target_name: string | null;
    ip: string | null;
    details: string | null;
    created_at: CreationOptional<Date>;
}
//# sourceMappingURL=audit-log.d.ts.map