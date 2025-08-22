import { Request, Response, NextFunction } from "express";

export async function tenantMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const host = req.headers.host; // Ej: "page1.example.com:3000"
  if (!host) return res.status(400).send("Host header missing");
  const subdomain = host.split(".")[0]; // "page1"
  (req as any).tenant = subdomain;
  next();
}
