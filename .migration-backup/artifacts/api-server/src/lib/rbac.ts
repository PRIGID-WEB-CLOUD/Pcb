import { db } from "@workspace/db";
import { teamMembers } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";
import { getSession } from "./auth";

const ROLE_LEVELS: Record<string, number> = {
  Viewer: 1,
  Editor: 2,
  Admin:  3,
  Owner:  4,
};

export async function getTeamRole(email: string): Promise<number> {
  const [member] = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.email, email))
    .limit(1);

  if (!member || member.status !== "active") {
    return 4;
  }

  return ROLE_LEVELS[member.role] ?? 1;
}

export function requireRole(minRole: keyof typeof ROLE_LEVELS) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await getSession(req);
      if (!user || user.role !== "ADMIN") {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const level = await getTeamRole(user.email);
      const required = ROLE_LEVELS[minRole] ?? 1;

      if (level < required) {
        return res.status(403).json({
          error: `Insufficient permissions. Requires ${minRole} role or higher.`,
        });
      }

      next();
    } catch {
      res.status(500).json({ error: "Authorization check failed" });
    }
  };
}

export function requireAdmin() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await getSession(req);
      if (!user || user.role !== "ADMIN") {
        return res.status(401).json({ error: "Unauthorized" });
      }
      next();
    } catch {
      res.status(500).json({ error: "Authorization check failed" });
    }
  };
}
