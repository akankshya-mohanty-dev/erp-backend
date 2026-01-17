import express from "express";
import {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
} from "../controllers/course.controller.js";

import protect from "../middleware/auth.middleware.js";
import roleCheck from "../middleware/role.middleware.js";

const router = express.Router();


router.post(
  "/",
  protect,
  roleCheck("ADMIN", "TEACHER"),
  createCourse
);

router.get(
  "/",
  protect,
  roleCheck("ADMIN", "TEACHER", "STUDENT"),
  getAllCourses
);

// Get single course
router.get(
  "/:id",
  protect,
  roleCheck("ADMIN", "TEACHER", "STUDENT"),
  getCourseById
);

// Update course
router.put(
  "/:id",
  protect,
  roleCheck("ADMIN", "TEACHER"),
  updateCourse
);

// Delete course (Admin only)
router.delete(
  "/:id",
  protect,
  roleCheck("ADMIN"),
  deleteCourse
);

export default router;
