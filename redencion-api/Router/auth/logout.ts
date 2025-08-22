import { Request, Response } from "express";
import prisma from "../../src/config/database";

export async function logoutHandler(req: Request, res: Response) {
  const authHeader = req.header("Authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : req.body?.refreshToken;

  if (!token)
    return res.status(400).json({ message: "Refresh token required" });

  try {
    await prisma.refreshToken.delete({ where: { token } });
  } catch {
    // Si no existe, consideramos idempotente
  }

  return res.json({ message: "Logout successful" });
}
