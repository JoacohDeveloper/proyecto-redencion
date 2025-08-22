export type JwtAccessPayload = {
  userId: string;
  tenantId: string;
  role?: "ADMIN" | "CLIENT";
  iat?: number;
  exp?: number;
};

declare global {
  namespace Express {
    interface Request {
      auth?: JwtAccessPayload;
      tenantFromHost?: string;
    }
  }
}
