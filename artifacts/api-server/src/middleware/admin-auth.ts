import { type Request, type Response, type NextFunction } from "express";

export function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Unauthorized", code: "NOT_AUTHENTICATED" });
    return;
  }
  next();
}
