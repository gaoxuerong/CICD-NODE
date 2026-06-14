import { CreationOptional, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
export declare class Project extends Model<InferAttributes<Project>, InferCreationAttributes<Project>> {
    id: CreationOptional<number>;
    name: string;
    description: string | null;
    git_url: string | null;
    language: string | null;
    status: string;
    source: string;
    github_owner: string | null;
    github_repo: string | null;
    github_default_branch: string | null;
    last_sync_at: Date | null;
    created_by: number | null;
    created_at: CreationOptional<Date>;
    updated_at: CreationOptional<Date>;
}
//# sourceMappingURL=project.d.ts.map