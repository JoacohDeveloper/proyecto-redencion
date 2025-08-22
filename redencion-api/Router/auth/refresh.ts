import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import prisma from "../../src/config/database";

const ACCESS_SECRET = process.env.ACCESS_SECRET!;
const REFRESH_SECRET = process.env.REFRESH_SECRET!;

type JwtRefreshPayload = {
  userId: string;
  tenantId: string;
  iat?: number;
  exp?: number;
};

export async function refreshHandler(req: Request, res: Response) {
  // Puedes aceptar por header Authorization o por body
  const authHeader = req.header("Authorization");
  const fromHeader = authHeader?.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : undefined;
  const refreshToken = fromHeader || req.body?.refreshToken;

  if (!refreshToken)
    return res.status(400).json({ message: "Refresh token required" });

  // Verificar que el token exista en DB
  const stored = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
  });
  if (!stored || stored.expiresAt < new Date()) {
    return res
      .status(401)
      .json({ message: "Refresh token expired or revoked" });
  }

  try {
    const payload = jwt.verify(
      refreshToken,
      REFRESH_SECRET
    ) as JwtRefreshPayload;

    // (Opcional) rotación de refresh token para mayor seguridad
    // const newRefreshToken = jwt.sign(
    //   { userId: payload.userId, tenantId: payload.tenantId },
    //   REFRESH_SECRET,
    //   { expiresIn: "7d" }
    // );
    // await prisma.$transaction([
    //   prisma.refreshToken.delete({ where: { token: refreshToken } }),
    //   prisma.refreshToken.create({
    //     data: {
    //       token: newRefreshToken,
    //       userId: payload.userId,
    //       expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    //     },
    //   }),
    // ]);

    // Emitir nuevo access token
    const newAccessToken = jwt.sign(
      {
        userId: payload.userId,
        tenantId: payload.tenantId,
      } as JwtRefreshPayload,
      ACCESS_SECRET,
      { expiresIn: "15m" }
    );

    // Si rotás, devolvé el nuevo refresh también:
    // return res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });

    return res.json({ accessToken: newAccessToken });
  } catch {
    return res.status(401).json({ message: "Invalid refresh token" });
  }
}
