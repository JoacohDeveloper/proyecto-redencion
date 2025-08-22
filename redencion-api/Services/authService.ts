import prisma from "../src/config/database";
import {
  SALT_ROUNDS,
  REFRESH_SECRET,
  ACCESS_SECRET,
} from "../src/config/constants";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const authService = {
  register: async (email: string, password: string, tenantId: string) => {
    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    return prisma.user.create({
      data: {
        email,
        password: hashed,
        tenantId,
        role: "CLIENT",
        client: {},
      },
    });
  },
  login: async (email: string, password: string, tenantId: string) => {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.tenantId !== tenantId) return null;

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return null;

    const accessToken = jwt.sign(
      { userId: user.uuid, tenantId },
      ACCESS_SECRET,
      {
        expiresIn: "15m",
      }
    );

    const refreshToken = jwt.sign(
      { userId: user.uuid, tenantId },
      REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.uuid,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
      },
    });

    return { accessToken, refreshToken };
  },

  verifyAccessToken: (token: string) => {
    try {
      return jwt.verify(token, ACCESS_SECRET) as any;
    } catch {
      return null;
    }
  },

  verifyRefreshToken: (token: string) => {
    try {
      return jwt.verify(token, REFRESH_SECRET) as any;
    } catch {
      return null;
    }
  },
  google: async (idToken: any, tenantId: string) => {
    try {
      // Validar token con Google
      const ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload) return { message: "Invalid token" };

      const email = payload.email!;
      const username = payload.name || email;

      // Buscar o crear usuario en la base de datos
      let user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            username,
            password: "", // dejar vacío o generar uno random
            role: "CLIENT",
            tenantId, // asignar tenant según tu lógica
          },
        });
      }

      // Generar JWT de acceso
      const accessToken = jwt.sign(
        { userId: user.uuid, tenantId: user.tenantId },
        process.env.ACCESS_SECRET!,
        { expiresIn: "15m" }
      );
      const refreshToken = jwt.sign(
        { userId: user.uuid, tenantId: user.tenantId },
        process.env.REFRESH_SECRET!,
        { expiresIn: "7d" }
      );

      // Guardarlo en DB
      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.uuid,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
        },
      });
      return { accessToken, refreshToken };
    } catch (error) {
      return { message: "Authentication failed" };
    }
  },
};
