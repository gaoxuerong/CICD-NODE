import { Request, Response } from 'express';

export interface ApiResponse<T = unknown> {
  code: number;
  message?: string;
  data?: T;
}

export function ok<T>(res: Response, data: T) {
  const payload: ApiResponse<T> = { code: 0, data };
  return res.json(payload);
}

export function created<T>(res: Response, data: T) {
  const payload: ApiResponse<T> = { code: 0, data };
  return res.status(201).json(payload);
}

export function message(res: Response, msg: string) {
  return res.json({ code: 0, message: msg } as ApiResponse);
}

export function fail(res: Response, status: number, msg: string) {
  return res.status(status).json({ code: -1, message: msg } as ApiResponse);
}

export function nextError(next: Function, status: number, message: string) {
  const error = new Error(message) as Error & { status: number };
  error.status = status;
  return next(error);
}
