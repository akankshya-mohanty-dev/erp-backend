import express from "express";
import protect from "../middleware/auth.middleware.js";
import roleCheck from "../middleware/role.middleware.js";

const router = express.Router();

router.get("/dashboard", protect, roleCheck("STUDENT"), (req, res) => {
  res.json({ message: "Student Dashboard" });
});

export default router;