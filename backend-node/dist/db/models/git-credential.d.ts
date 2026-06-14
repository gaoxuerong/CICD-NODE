import { CreationOptional, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
export declare class GitCredential extends Model<InferAttributes<GitCredential>, InferCreationAttributes<GitCredential>> {
    id: CreationOptional<number>;
    name: string;
    type: string;
    username: string | null;
    credential: string;
    description: string | null;
    created_by: number | null;
    created_at: CreationOptional<Date>;
    updated_at: CreationOptional<Date>;
}
//# sourceMappingURL=git-credential.d.ts.map