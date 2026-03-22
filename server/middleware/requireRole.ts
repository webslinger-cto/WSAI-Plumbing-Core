/**
 * requireRole — Express middleware for role-based access control.
 *
 * Usage:
 *   app.get("/api/admin/users", requireRole("admin"), handler);
 *   app.post("/api/invoices", requireRole("admin", "dispatcher"), handler);
 *
 * Returns 401 if the request is not authenticated.
 * Returns 403 with a descriptive JSON body if the user lacks the required role.
 */

import type { Request, Response, NextFunction } from "express";

export type UserRole = "admin" | "dispatcher" | "technician" | "salesperson";

// Augment Express Request to include the user object set by Passport.js
declare global {
  namespace Express {
    interface User {
      id: string;
      username: string;
      role: string;
      isSuperAdmin?: boolean | null;
    }
  }
}

/**
 * Returns an Express middleware that enforces role requirements.
 * Super-admins (isSuperAdmin === true) bypass all role checks.
 *
 * @param roles - One or more allowed roles. Pass nothing to require only authentication.
 */
export function requireRole(...roles: UserRole[]) {
  return function roleGuard(req: Request, res: Response, next: NextFunction) {
    // Must be authenticated (req.user / req.isAuthenticated are added by Passport.js at runtime)
    const r = req as any;
    if (!r.isAuthenticated || !r.isAuthenticated() || !r.user) {
      return res
        .status(401)
        .json({ error: "Authentication required." });
    }

    const user = r.user as Express.User;

    // Super-admins always pass
    if (user.isSuperAdmin) {
      return next();
    }

    // No role restriction — just require authentication
    if (roles.length === 0) {
      return next();
    }

    if (!roles.includes(user.role as UserRole)) {
      return res.status(403).json({
        error: `Access denied. Required role: ${roles.join(" or ")}. Your role: ${user.role}.`,
      });
    }

    return next();
  };
}
