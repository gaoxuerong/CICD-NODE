import type { ResultSetHeader } from 'mysql2/promise';
export declare function query<T = any>(sql: string, params?: any[]): Promise<T[]>;
export declare function queryOne<T = any>(sql: string, params?: any[]): Promise<T | null>;
export declare function execute(sql: string, params?: any[]): Promise<ResultSetHeader>;
export declare function insert(sql: string, params?: any[]): Promise<number>;
export declare function update(sql: string, params?: any[]): Promise<number>;
//# sourceMappingURL=query.d.ts.map