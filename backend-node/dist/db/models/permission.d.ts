import { CreationOptional, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
export declare class Permission extends Model<InferAttributes<Permission>, InferCreationAttributes<Permission>> {
    id: CreationOptional<number>;
    code: string;
    name: string;
    resource: string;
    action: string;
    description: string | null;
    created_at: CreationOptional<Date>;
}
//# sourceMappingURL=permission.d.ts.map