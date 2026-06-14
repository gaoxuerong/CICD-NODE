import { CreationOptional, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
export declare class SystemSetting extends Model<InferAttributes<SystemSetting>, InferCreationAttributes<SystemSetting>> {
    id: CreationOptional<number>;
    key: string;
    value: string;
    updated_at: CreationOptional<Date>;
}
//# sourceMappingURL=system-setting.d.ts.map