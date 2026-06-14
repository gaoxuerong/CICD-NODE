import { CreationOptional, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
export declare class Build extends Model<InferAttributes<Build>, InferCreationAttributes<Build>> {
    id: CreationOptional<number>;
    build_number: number;
    pipeline_id: number | null;
    project_id: number;
    branch: string | null;
    commit_sha: string | null;
    commit_message: string | null;
    status: string;
    trigger_by: number | null;
    duration: number | null;
    logs: string | null;
    started_at: Date | null;
    finished_at: Date | null;
    github_run_id: number | null;
    github_run_url: string | null;
    github_workflow_id: string | null;
    github_workflow_name: string | null;
    created_at: CreationOptional<Date>;
}
//# sourceMappingURL=build.d.ts.map