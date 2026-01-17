import express from "express";
import protect from "../middleware/auth.middleware.js";
import roleCheck from "../middleware/role.middleware.js";
import { adminDashboard } from "../controllers/admin.controller.js";

const router = express.Router();

router.get("/dashboard", protect, roleCheck("ADMIN"), adminDashboard);

export default router;
