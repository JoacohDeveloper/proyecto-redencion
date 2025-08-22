import { Request, Response, NextFunction } from "express";

export function requireTenantMatch(
  source: "host" | "param" | "header" = "host"
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const tokenTenant = req.auth?.tenantId;
    let requestedTenant: string | undefined;

    if (source === "host") requestedTenant = (req as any).tenantId;
    if (source === "param") requestedTenant = (req.params as any).tenantId;
    if (source === "header")
      requestedTenant = req.header("X-Tenant-Id") || undefined;

    if (!tokenTenant || !requestedTenant || tokenTenant !== requestedTenant) {
      return res.status(403).json({ message: "Tenant mismatch or missing" });
    }
    next();
  };
}
