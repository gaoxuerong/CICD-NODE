import { CreationOptional, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
export declare class ProjectMember extends Model<InferAttributes<ProjectMember>, InferCreationAttributes<ProjectMember>> {
    id: CreationOptional<number>;
    project_id: number;
    user_id: number;
    role: string;
    joined_at: Date;
}
//# sourceMappingURL=project-member.d.ts.map