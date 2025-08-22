import { Router } from "express";
import { requireAuth } from "../middlewares/authmiddleware";
import { requireTenantMatch } from "../middlewares/requiretenantmiddleware";

const router = Router();

//common private routes
router.post("/a", requireAuth, requireTenantMatch("host"), async (req, res) => {
  res.json({ ok: true, tenantId: req.auth!.tenantId });
});

export default router;
