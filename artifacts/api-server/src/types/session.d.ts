import "express-session";

declare module "express-session" {
  interface SessionData {
    userId?: number;
    userEmail?: string;
  }
}

declare global {
  namespace Express {
    interface User {
      id: number;
      googleId: string;
      email: string;
      name: string | null;
      avatar: string | null;
      lastLogin: Date | null;
      createdAt: Date | null;
    }
  }
}
