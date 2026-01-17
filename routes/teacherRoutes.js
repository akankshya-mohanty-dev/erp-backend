import express from "express";
import protect from "../middleware/auth.middleware.js";
import roleCheck from "../middleware/role.middleware.js";

const router = express.Router();

router.get("/dashboard", protect, roleCheck("TEACHER"), (req, res) => {
  res.json({ message: "Teacher Dashboard" });
});

export default router;
