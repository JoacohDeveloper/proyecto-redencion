import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JwtAccessPayload } from "../src/types/auth.js";
import { ACCESS_SECRET } from "../src/config/constants.js";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "Missing or invalid Authorization header" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(token, ACCESS_SECRET) as JwtAccessPayload;
    req.auth = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Access token invalid or expired" });
  }
}
