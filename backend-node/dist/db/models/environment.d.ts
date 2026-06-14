import { CreationOptional, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
export declare class Environment extends Model<InferAttributes<Environment>, InferCreationAttributes<Environment>> {
    id: CreationOptional<number>;
    name: string;
    type: string;
    project_id: number;
    deploy_url: string | null;
    description: string | null;
    status: string;
    created_by: number | null;
    created_at: CreationOptional<Date>;
    updated_at: CreationOptional<Date>;
}
//# sourceMappingURL=environment.d.ts.map