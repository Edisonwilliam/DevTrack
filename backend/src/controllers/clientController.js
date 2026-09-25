const Client = require("../models/Client");

// Create a client
const createClient = async (req, res) => {
  try {
    const { name, email, phone, company, address, notes } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "Client name is required",
      });
    }

    const client = await Client.create({
      name,
      email,
      phone,
      company,
      address,
      notes,
      user: req.user.userId,
    });

    res.status(201).json({
      message: "Client created successfully",
      client,
    });
  } catch (error) {
    console.error("Create client error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// Get all clients belonging to logged-in user
const getClients = async (req, res) => {
  try {
    const clients = await Client.find({
      user: req.user.userId,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      clients,
    });
  } catch (error) {
    console.error("Get clients error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// Get one client
const getClient = async (req, res) => {
  try {
    const client = await Client.findOne({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!client) {
      return res.status(404).json({
        message: "Client not found",
      });
    }

    res.status(200).json({
      client,
    });
  } catch (error) {
    console.error("Get client error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// Update a client
const updateClient = async (req, res) => {
  try {
    const client = await Client.findOne({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!client) {
      return res.status(404).json({
        message: "Client not found",
      });
    }

    const { name, email, phone, company, address, notes } = req.body;

    client.name = name ?? client.name;
    client.email = email ?? client.email;
    client.phone = phone ?? client.phone;
    client.company = company ?? client.company;
    client.address = address ?? client.address;
    client.notes = notes ?? client.notes;

    await client.save();

    res.status(200).json({
      message: "Client updated successfully",
      client,
    });
  } catch (error) {
    console.error("Update client error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// Delete a client
const deleteClient = async (req, res) => {
  try {
    const client = await Client.findOne({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!client) {
      return res.status(404).json({
        message: "Client not found",
      });
    }

    await client.deleteOne();

    res.status(200).json({
      message: "Client deleted successfully",
    });
  } catch (error) {
    console.error("Delete client error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

module.exports = {
  createClient,
  getClients,
  getClient,
  updateClient,
  deleteClient,
};