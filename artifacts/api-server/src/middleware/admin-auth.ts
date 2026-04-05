import { type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { adminUsers } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

export async function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.path.startsWith("/admin")) {
    return next();
  }
  if (!req.session?.userId) {
    res.status(401).json({ error: "Unauthorized", code: "NOT_AUTHENTICATED" });
    return;
  }
  try {
    const [user] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.id, req.session.userId))
      .limit(1);

    if (!user) {
      res.status(403).json({ error: "Forbidden", code: "NOT_ADMIN" });
      return;
    }
    next();
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
}
