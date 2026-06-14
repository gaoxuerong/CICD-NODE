import { CreationOptional, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
export declare class Pipeline extends Model<InferAttributes<Pipeline>, InferCreationAttributes<Pipeline>> {
    id: CreationOptional<number>;
    name: string;
    project_id: number;
    trigger_type: string;
    branch_filter: string | null;
    config: string | null;
    status: string;
    last_build_at: Date | null;
    created_by: number | null;
    created_at: CreationOptional<Date>;
    updated_at: CreationOptional<Date>;
}
//# sourceMappingURL=pipeline.d.ts.map