export type AuthUser = {
  id: number;
  username: string;
  email: string;
  nickname?: string | null;
  avatar?: string | null;
  role: string;
  status: string;
  is_superuser: number | boolean;
  created_at: string;
  updated_at: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
