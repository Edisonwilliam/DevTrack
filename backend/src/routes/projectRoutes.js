const express = require("express");

const {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
} = require("../controllers/projectController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.post("/", createProject);

router.get("/", getProjects);

router.get("/:id", getProject);

router.put("/:id", updateProject);

router.delete("/:id", deleteProject);

module.exports = router;