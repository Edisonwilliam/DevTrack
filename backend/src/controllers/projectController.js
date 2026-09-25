const mongoose = require("mongoose");
const Project = require("../models/Project");
const Client = require("../models/Client");

// Create project
const createProject = async (req, res) => {
  try {
    const {
      name,
      description,
      status,
      budget,
      startDate,
      dueDate,
      client,
    } = req.body;

    if (!name || budget === undefined || !client) {
      return res.status(400).json({
        message: "Name, budget and client are required",
      });
    }

    // Make sure client is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(client)) {
      return res.status(400).json({
        message: "Invalid client ID",
      });
    }

    // Make sure the client belongs to the logged-in user
    const existingClient = await Client.findOne({
      _id: client,
      user: req.user.userId,
    });

    if (!existingClient) {
      return res.status(404).json({
        message: "Client not found",
      });
    }

    const project = await Project.create({
      name,
      description,
      status,
      budget,
      startDate,
      dueDate,
      client,
      user: req.user.userId,
    });

    const populatedProject = await Project.findById(project._id).populate(
      "client",
      "name email company"
    );

    res.status(201).json({
      message: "Project created successfully",
      project: populatedProject,
    });
  } catch (error) {
    console.error("Create project error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// Get all projects
const getProjects = async (req, res) => {
  try {
    const projects = await Project.find({
      user: req.user.userId,
    })
      .populate("client", "name email company")
      .sort({ createdAt: -1 });

    res.status(200).json({
      projects,
    });
  } catch (error) {
    console.error("Get projects error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// Get one project
const getProject = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        message: "Invalid project ID",
      });
    }

    const project = await Project.findOne({
      _id: req.params.id,
      user: req.user.userId,
    }).populate("client", "name email company");

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    res.status(200).json({
      project,
    });
  } catch (error) {
    console.error("Get project error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// Update project
const updateProject = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        message: "Invalid project ID",
      });
    }

    const project = await Project.findOne({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    const {
      name,
      description,
      status,
      budget,
      startDate,
      dueDate,
      client,
    } = req.body;

    // If changing the client, validate the new client ID
    if (client !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(client)) {
        return res.status(400).json({
          message: "Invalid client ID",
        });
      }

      const existingClient = await Client.findOne({
        _id: client,
        user: req.user.userId,
      });

      if (!existingClient) {
        return res.status(404).json({
          message: "Client not found",
        });
      }

      project.client = client;
    }

    project.name = name ?? project.name;
    project.description = description ?? project.description;
    project.status = status ?? project.status;
    project.budget = budget ?? project.budget;
    project.startDate = startDate ?? project.startDate;
    project.dueDate = dueDate ?? project.dueDate;

    await project.save();

    const populatedProject = await Project.findById(project._id).populate(
      "client",
      "name email company"
    );

    res.status(200).json({
      message: "Project updated successfully",
      project: populatedProject,
    });
  } catch (error) {
    console.error("Update project error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// Delete project
const deleteProject = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        message: "Invalid project ID",
      });
    }

    const project = await Project.findOne({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    await project.deleteOne();

    res.status(200).json({
      message: "Project deleted successfully",
    });
  } catch (error) {
    console.error("Delete project error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

module.exports = {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
};
