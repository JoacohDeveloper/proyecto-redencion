import { Request, Response, NextFunction } from "express";
import { authService } from "../../Services/authService";

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ message: "No token" });

  const token = authHeader.split(" ")[1];
  const payload = authService.verifyAccessToken(token);

  if (!payload) return res.status(403).json({ message: "Invalid token" });

  (req as any).userId = payload.userId;
  (req as any).tenantId = payload.tenantId;
  next();
};
