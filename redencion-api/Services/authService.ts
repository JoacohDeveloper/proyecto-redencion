import prisma from "../src/config/database";
import {
  SALT_ROUNDS,
  REFRESH_SECRET,
  ACCESS_SECRET,
} from "../src/config/constants";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { $Enums, Role } from "../generated/prisma";
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export interface UserData {
  uuid: string;
  username: string | null;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
  role: Role;
  tenantId: string;
  adminUserUserId: string | null;
  clientUserUserId: string | null;
}

export interface NewTenantData {
  tenant: string;
  uuid: string;
}

export interface RegisterWithTenant {
  newTenant: NewTenantData;
  user: UserData;
}

export interface ErrorMessage {
  message: string;
}

export type RegisterReturnData = UserData | RegisterWithTenant | ErrorMessage;

export const authService = {
  register: async (
    email: string,
    password: string,
    tenantId: string
  ): Promise<RegisterReturnData> => {
    const hashed = await bcrypt.hash(password, SALT_ROUNDS);

    const dbTenant = await prisma.tenant.findUnique({
      where: {
        tenant: tenantId,
      },
    });

    if (!dbTenant) {
      return await prisma.$transaction(async (tx) => {
        const newTenant = await tx.tenant.create({
          data: { tenant: tenantId },
        });

        const user = await tx.user.create({
          data: {
            email,
            password: hashed,
            tenantId: newTenant.uuid,
            role: "CLIENT",
            client: {
              create: {},
            },
          },
        });

        return { newTenant, user };
      });
    } else {
      const existsUser = await prisma.user.findFirst({
        where: {
          email,
        },
      });

      if (existsUser) return { message: "User already exists" };
      return await prisma.user.create({
        data: {
          email,
          password: hashed,
          tenantId: dbTenant.uuid,
          role: "CLIENT",
          client: {
            create: {},
          },
        },
      });
    }
  },
  login: async (email: string, password: string, tenantId: string) => {
    const user = await prisma.user.findUnique({ where: { email } });

    const tenant = await prisma.tenant.findFirst({
      where: {
        tenant: tenantId,
      },
    });
    if (!user || user.tenantId !== tenant?.uuid) return null;

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return null;

    const accessToken = jwt.sign(
      {
        userId: user.uuid,
        tenantId: tenant.uuid,
        username: user.username,
        role: user.role,
      },
      ACCESS_SECRET,
      {
        expiresIn: "30m",
      }
    );

    const refreshToken = jwt.sign(
      {
        userId: user.uuid,
        tenantId: tenant.uuid,
        username: user.username,
        role: user.role,
      },
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

    return {
      tokens: { accessToken, refreshToken },
      user: {
        username: user.username,
        userId: user.uuid,
        role: user.role,
        email: user.email,
      },
    };
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
        {
          userId: user.uuid,
          tenantId: user.tenantId,
          username: user.username,
          role: user.role,
        },
        process.env.ACCESS_SECRET!,
        { expiresIn: "30m" }
      );
      const refreshToken = jwt.sign(
        {
          userId: user.uuid,
          tenantId: user.tenantId,
          username: user.username,
          role: user.role,
        },
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
