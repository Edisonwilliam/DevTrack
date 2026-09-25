const express = require("express");

const {
  createTask,
  getTasks,
  getProjectTasks,
  getTask,
  updateTask,
  deleteTask,
} = require("../controllers/taskController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.post("/", createTask);

router.get("/", getTasks);

router.get("/project/:projectId", getProjectTasks);

router.get("/:id", getTask);

router.put("/:id", updateTask);

router.delete("/:id", deleteTask);

module.exports = router;