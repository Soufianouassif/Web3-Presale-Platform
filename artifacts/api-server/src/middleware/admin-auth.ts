import { type Request, type Response, type NextFunction } from "express";

export function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  // Only protect /admin/* routes — skip public routes that pass through this middleware
  if (!req.path.startsWith("/admin")) {
    return next();
  }
  if (!req.session?.userId) {
    res.status(401).json({ error: "Unauthorized", code: "NOT_AUTHENTICATED" });
    return;
  }
  next();
}
