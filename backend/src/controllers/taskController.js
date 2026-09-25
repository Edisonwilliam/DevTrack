const Task = require("../models/Task");
const Project = require("../models/Project");

// Create task
const createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      status,
      priority,
      dueDate,
      project,
    } = req.body;

    if (!title || !project) {
      return res.status(400).json({
        message: "Title and project are required",
      });
    }

    // Make sure the project belongs to the logged-in user
    const existingProject = await Project.findOne({
      _id: project,
      user: req.user.userId,
    });

    if (!existingProject) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    const task = await Task.create({
      title,
      description,
      status,
      priority,
      dueDate,
      project,
      user: req.user.userId,
    });

    res.status(201).json({
      message: "Task created successfully",
      task,
    });
  } catch (error) {
    console.error("Create task error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// Get all tasks belonging to logged-in user
const getTasks = async (req, res) => {
  try {
    const tasks = await Task.find({
      user: req.user.userId,
    })
      .populate("project", "name status")
      .sort({ createdAt: -1 });

    res.status(200).json({
      tasks,
    });
  } catch (error) {
    console.error("Get tasks error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// Get tasks for one project
const getProjectTasks = async (req, res) => {
  try {
    // First make sure the project belongs to the user
    const project = await Project.findOne({
      _id: req.params.projectId,
      user: req.user.userId,
    });

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    const tasks = await Task.find({
      project: req.params.projectId,
      user: req.user.userId,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      tasks,
    });
  } catch (error) {
    console.error("Get project tasks error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// Get one task
const getTask = async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      user: req.user.userId,
    }).populate("project", "name status");

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    res.status(200).json({
      task,
    });
  } catch (error) {
    console.error("Get task error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// Update task
const updateTask = async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    const {
      title,
      description,
      status,
      priority,
      dueDate,
      project,
    } = req.body;

    // If changing the project, make sure the new project
    // belongs to the logged-in user.
    if (project) {
      const existingProject = await Project.findOne({
        _id: project,
        user: req.user.userId,
      });

      if (!existingProject) {
        return res.status(404).json({
          message: "Project not found",
        });
      }

      task.project = project;
    }

    task.title = title ?? task.title;
    task.description = description ?? task.description;
    task.status = status ?? task.status;
    task.priority = priority ?? task.priority;
    task.dueDate = dueDate ?? task.dueDate;

    await task.save();

    res.status(200).json({
      message: "Task updated successfully",
      task,
    });
  } catch (error) {
    console.error("Update task error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// Delete task
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    await task.deleteOne();

    res.status(200).json({
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("Delete task error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

module.exports = {
  createTask,
  getTasks,
  getProjectTasks,
  getTask,
  updateTask,
  deleteTask,
};