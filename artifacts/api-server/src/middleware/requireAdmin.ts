import { type Request, type Response, type NextFunction } from "express";

export const SESSION_COOKIE = "luxe_session";

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "CUSTOMER";
  passwordHash: string;
}

export const sessions = new Map<string, string>();
export const users: StoredUser[] = [];

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
  if (!token) return res.status(401).json({ error: "Authentication required." });
  const userId = sessions.get(token);
  if (!userId) return res.status(401).json({ error: "Session expired — please log in again." });
  const user = users.find((u) => u.id === userId);
  if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Admin access required." });
  next();
}
