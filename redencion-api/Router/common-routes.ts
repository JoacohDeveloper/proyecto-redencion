import { Router } from "express";
import { authService, UserData } from "../Services/authService";
import jwt from "jsonwebtoken";
import prisma from "../src/config/database";
import { requireAuth } from "../middlewares/authmiddleware";
import { requireTenantMatch } from "../middlewares/requiretenantmiddleware";
import multer, { memoryStorage } from "multer";
import { productSchema } from "../Models/productModel";
import { User } from "../generated/prisma";
import { RegisterReturnData } from "../Services/authService";
import { categorySchema } from "../Models/categoryModel";
import { CategoryService } from "../Services/categoryService";
import { productService } from "../Services/productService";
const router = Router();

const storage = multer.memoryStorage(); // en memoria, útil para subir a Cloudinary

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB máx
  fileFilter: (req, file, cb) => {
    const allowedImage = ["image/jpeg", "image/png", "image/webp"];
    const allowedVideo = ["video/mp4", "video/webm", "video/ogg", "video/mov"];

    if (
      allowedImage.includes(file.mimetype) ||
      allowedVideo.includes(file.mimetype)
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only Video or Image are allowed"));
    }
  },
});

//Auth routes

router.post("/register", async (req, res) => {
  try {
    const { email, password, tenantId } = req.body;
    // const tenantId = (req as any).tenantId;

    if (!email || !password || !tenantId)
      return res.status(400).json({ message: "Missing fields" });
    const user = await authService.register(email, password, tenantId);

    if ("uuid" in user)
      res.json({ id: user.uuid, email: user.email, tenantId: user.tenantId });
    else {
      res.json(user);
    }
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password, tenantId } = req.body;

    // const tenantId = (req as any).tenantId;
    console.log(tenantId);
    const tokens = await authService.login(email, password, tenantId);
    if (!tokens)
      return res
        .status(401)
        .json({ message: "Invalid credentials or not exists" });
    res.json(tokens);
  } catch (error) {
    res.status(500).json({ error: "Invalid Request." });
  }
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
  try {
    const { idToken, tenantId } = req.body;
    const result = await authService.google(idToken, tenantId);

    if ("message" in result) {
      return res.status(401).json(result);
    }

    res.json(result);
  } catch (error) {
    res.json({ error: "Invalid Request." }).status(500);
  }
});

//common private routes

//CREATE PRODUCT
router.post(
  "/products/create",
  upload.array("media", 10),
  requireAuth,
  requireTenantMatch("header"),
  async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];

      const { stock, categoryId, price, ...att } = req.body;
      const tenantId = req.params?.tenant;
      // validar atributos
      const validatedData = productSchema.parse({
        ...att,
        stock: Number(stock),
        price: Number(price),
      });

      //validar imagenes

      files?.forEach((file) => {
        const isImage = file.mimetype.startsWith("image/");
        const isVideo = file.mimetype.startsWith("video/");

        if (!isImage && !isVideo) {
          return res
            .status(400)
            .json({ error: `'${file?.filename}' is not a valid file` });
        }
      });

      //archivos validados.
      const allData = { tenantId, categoryId, ...validatedData, files };
      const result = await productService.create(
        tenantId,
        categoryId,
        allData.name,
        allData.price,
        allData.currency,
        allData.type,
        allData.description ?? "",
        allData.stock ?? 1,
        files
      );

      res.json({
        ok: true,
        tenantId: req.auth!.tenantId,
        result,
      });
    } catch (error) {
      res.status(500).json({ error: "Invalid Request" });
    }
  }
);

//REMOVE PRODUCT
router.delete(
  "/products/:id",
  requireAuth,
  requireTenantMatch("header"),
  async (req, res) => {
    try {
      const tenantId = req.params?.tenant;
      const { id } = req.params;

      if (!id) res.status(400).json({ message: "Bad Request" });

      const result = await productService.delete(tenantId, id);

      res.json({
        ok: true,
        tenantId: req.auth!.tenantId,
        result,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);
//MODIFY PRODUCT
router.put(
  "/products/:id",
  upload.array("media", 10),
  requireAuth,
  requireTenantMatch("header"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const tenantId = req.params?.tenant;
      const files = req.files as Express.Multer.File[];

      const { stock, deletedIds, categoryId, price, ...att } = req.body;
      if (!id) res.status(400).json({ message: "Bad Request" });

      const validatedData = productSchema.parse({
        ...att,
        stock: Number(stock),
        price: Number(price),
      });

      files?.forEach((file) => {
        const isImage = file.mimetype.startsWith("image/");
        const isVideo = file.mimetype.startsWith("video/");

        if (!isImage && !isVideo) {
          return res
            .status(400)
            .json({ error: `'${file?.filename}' is not a valid file` });
        }
      });

      //archivos validados.
      const allData = { tenantId, categoryId, ...validatedData, files };
      const result = await productService.modify(
        tenantId,
        categoryId,
        allData.name,
        allData.price,
        allData.currency,
        allData.type,
        allData.description ?? "",
        allData.stock ?? 1,
        files,
        deletedIds,
        id
      );

      res.json({
        ok: true,
        tenantId: req.auth!.tenantId,
        result,
      });
    } catch (error) {}
  }
);
//GET PRODUCT // filters etc
router.get("/products", (req, res) => {
  return res.redirect(`${req.originalUrl}/1`);
});
router.get(
  "/products/:page",
  requireAuth,
  requireTenantMatch("header"),
  async (req, res) => {
    try {
      const tenantId = req.params?.tenant; // depende de cómo pasás tenant
      const page = parseInt(req.params.page, 10) || 1; // default 1
      const pageSize = 3;

      const result = await productService.getAll(tenantId, page, pageSize);

      res.json({
        ok: true,
        tenantId: req.auth!.tenantId,
        page,
        pageSize,
        ...result,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.get(
  "/product/:id",
  requireAuth,
  requireTenantMatch("header"),
  async (req, res) => {
    try {
      const tenantId = req.params?.tenant;
      const { id } = req.params;

      if (!id) res.status(400).json({ message: "Bad Request" });
      const result = await productService.findById(tenantId, id);

      res.json({
        ok: true,
        tenantId: req.auth!.tenantId,
        result,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.get(
  "/products/:name",
  requireAuth,
  requireTenantMatch("header"),
  async (req, res) => {
    try {
      const tenantId = req.params?.tenant;
      const { name } = req.params;

      if (!name) res.status(400).json({ message: "Bad Request" });
      const result = await productService.findByName(tenantId, name);

      res.json({
        ok: true,
        tenantId: req.auth!.tenantId,
        result,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// CREATE Category

router.post(
  "/categories/create",
  requireAuth,
  requireTenantMatch("header"),
  async (req, res) => {
    try {
      const { name, description } = req.body;
      const validatedData = categorySchema.parse({
        name,
        description,
      });
      const tenantId = req.params?.tenant;
      const result = await CategoryService.create(
        validatedData.name ?? "",
        validatedData.description ?? "",
        tenantId
      );

      res.json({
        ok: true,
        tenantId: req.auth!.tenantId,
        result,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);
//nested
router.post(
  "/categories/create/:nestedId",
  requireAuth,
  requireTenantMatch("header"),
  async (req, res) => {
    try {
      const { name, description } = req.body;
      const { nestedId } = req.params;
      const validatedData = categorySchema.parse({
        name,
        description,
      });
      const tenantId = req.params?.tenant;
      const result = await CategoryService.createNested(
        validatedData.name ?? "",
        validatedData.description ?? "",
        tenantId,
        nestedId
      );

      res.json({
        ok: true,
        tenantId: req.auth!.tenantId,
        result,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);
// Category Remove
router.delete(
  "/categories/:id",
  requireAuth,
  requireTenantMatch("header"),
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) res.status(400).json({ message: "Bad Request" });

      const tenantId = req.params?.tenant;

      const result = await CategoryService.delete(id, tenantId);

      res.json({
        ok: true,
        tenantId: req.auth!.tenantId,
        result,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);
// Categories
router.get(
  "/categories/",
  requireAuth,
  requireTenantMatch("header"),
  async (req, res) => {
    try {
      const tenantId = req.params?.tenant;

      const result = await CategoryService.all(tenantId);

      res.json({
        ok: true,
        tenantId: req.auth!.tenantId,
        result,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);
router.get(
  "/categories/:name/",
  requireAuth,
  requireTenantMatch("header"),
  async (req, res) => {
    try {
      const tenantId = req.params?.tenant;
      const { name } = req.params;
      if (!name) res.status(400).json({ message: "Bad Request" });
      let result = await CategoryService.find(tenantId, name);
      res.json({
        ok: true,
        tenantId: req.auth!.tenantId,
        result,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);
router.get(
  "/categories/:name/:parent",
  requireAuth,
  requireTenantMatch("header"),
  async (req, res) => {
    try {
      const tenantId = req.params?.tenant;
      const { name, parent } = req.params;
      if (!name) res.status(400).json({ message: "Bad Request" });
      let result;
      if (!parent) result = await CategoryService.find(tenantId, name);
      else result = await CategoryService.findNesteds(tenantId, name, parent);
      res.json({
        ok: true,
        tenantId: req.auth!.tenantId,
        result,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);
router.get(
  "/category/:id/",
  requireAuth,
  requireTenantMatch("header"),
  async (req, res) => {
    try {
      const tenantId = req.params?.tenant;
      const { id } = req.params;
      if (!id) res.status(400).json({ message: "Bad Request" });
      const result = await CategoryService.findById(tenantId, id);
      res.json({
        ok: true,
        tenantId: req.auth!.tenantId,
        result,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Modify Category

router.put(
  "/categories/:id",
  requireAuth,
  requireTenantMatch("header"),
  async (req, res) => {
    try {
      const { name, description } = req.body;
      const validatedData = categorySchema.parse({
        name,
        description,
      });
      const tenantId = req.params?.tenant;
      const { id } = req.params;
      if (!id) res.status(400).json({ message: "Bad Request" });

      const result = await CategoryService.modify(
        validatedData.name ?? "",
        validatedData.description ?? "",
        tenantId,
        id
      );

      res.json({
        ok: true,
        tenantId: req.auth!.tenantId,
        result,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
