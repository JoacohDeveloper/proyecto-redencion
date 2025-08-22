import { Router } from "express";
import { authService } from "../Services/authService";
import jwt from "jsonwebtoken";
import prisma from "../src/config/database";
const router = Router();

//Auth routes

router.post("/register", async (req, res) => {
  const { email, password } = req.body;
  const tenantId = (req as any).tenantId;
  if (!email || !password || !tenantId)
    return res.status(400).json({ message: "Missing fields" });
  try {
    const user = await authService.register(email, password, tenantId);
    res.json({ id: user.uuid, email: user.email, tenantId: user.tenantId });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const tenantId = (req as any).tenantId;
  const tokens = await authService.login(email, password, tenantId);
  if (!tokens) return res.status(401).json({ message: "Invalid credentials" });

  res.json(tokens);
});

// Refresh token
router.post("/refresh", async (req, res) => {
  const refreshToken = req.headers.authorization?.split(" ")[1];
  if (!refreshToken) return res.status(401).json({ message: "No token" });

  // Verificar que existe en DB
  const storedToken = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
  });
  if (!storedToken) return res.status(403).json({ message: "Invalid token" });

  try {
    const payload: any = jwt.verify(refreshToken, process.env.REFRESH_SECRET!);

    const newAccessToken = jwt.sign(
      { userId: payload.userId, tenantId: payload.tenantId },
      process.env.ACCESS_SECRET!,
      { expiresIn: "15m" }
    );

    res.json({ accessToken: newAccessToken });
  } catch {
    return res.status(403).json({ message: "Token expired or invalid" });
  }
});

router.post("/logout", async (req, res) => {
  const refreshToken = req.headers.authorization?.split(" ")[1];
  if (!refreshToken)
    return res.status(400).json({ message: "No token provided" });

  try {
    // Eliminar refresh token de la DB
    await prisma.refreshToken.delete({
      where: { token: refreshToken },
    });

    res.json({ message: "Logout successful" });
  } catch (error) {
    // Si el token no existe en DB, igual podemos considerar logout exitoso
    res.json({ message: "Logout successful" });
  }
});

router.post("/google", async (req, res) => {
  const { idToken, tenantId } = req.body;
  const result = await authService.google(idToken, tenantId);

  if ("message" in result) {
    return res.status(401).json(result);
  }

  res.json(result);
});

export default router;
