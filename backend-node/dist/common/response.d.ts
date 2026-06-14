import { Response } from 'express';
export interface ApiResponse<T = unknown> {
    code: number;
    message?: string;
    data?: T;
}
export declare function ok<T>(res: Response, data: T): Response<any, Record<string, any>>;
export declare function created<T>(res: Response, data: T): Response<any, Record<string, any>>;
export declare function message(res: Response, msg: string): Response<any, Record<string, any>>;
export declare function fail(res: Response, status: number, msg: string): Response<any, Record<string, any>>;
export declare function nextError(next: Function, status: number, message: string): any;
//# sourceMappingURL=response.d.ts.map