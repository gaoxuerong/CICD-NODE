import { CreationOptional, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
export declare class Role extends Model<InferAttributes<Role>, InferCreationAttributes<Role>> {
    id: CreationOptional<number>;
    code: string;
    name: string;
    description: string | null;
    level: number;
    is_system: number;
    permissions: string | string[];
    created_at: CreationOptional<Date>;
    updated_at: CreationOptional<Date>;
}
//# sourceMappingURL=role.d.ts.map