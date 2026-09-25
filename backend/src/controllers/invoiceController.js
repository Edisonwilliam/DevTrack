const Invoice = require("../models/Invoice");
const Client = require("../models/Client");
const Project = require("../models/Project");

const generateInvoiceNumber = () => {
  const timestamp = Date.now();

  return `INV-${timestamp}`;
};

const roundMoney = (value) => {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
};

// Create invoice
const createInvoice = async (req, res) => {
  try {
    const {
      client,
      project,
      items,
      tax = 0,
      dueDate,
    } = req.body;

    if (!client || !items || !dueDate) {
      return res.status(400).json({
        message: "Client, items and due date are required",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "Invoice must contain at least one item",
      });
    }

    // Make sure client belongs to current user
    const existingClient = await Client.findOne({
      _id: client,
      user: req.user.userId,
    });

    if (!existingClient) {
      return res.status(404).json({
        message: "Client not found",
      });
    }

    // Project is optional
    let existingProject = null;

    if (project) {
      existingProject = await Project.findOne({
        _id: project,
        user: req.user.userId,
      });

      if (!existingProject) {
        return res.status(404).json({
          message: "Project not found",
        });
      }

      // Make sure project belongs to selected client
      if (existingProject.client.toString() !== client.toString()) {
        return res.status(400).json({
          message: "Project does not belong to this client",
        });
      }
    }

    // Calculate invoice items on the server
    const calculatedItems = items.map((item) => {
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);

      if (
        !item.description ||
        !Number.isFinite(quantity) ||
        !Number.isFinite(unitPrice) ||
        quantity <= 0 ||
        unitPrice < 0
      ) {
        throw new Error("Invalid invoice item");
      }

      const amount = roundMoney(quantity * unitPrice);

      return {
        description: item.description.trim(),
        quantity,
        unitPrice: roundMoney(unitPrice),
        amount,
      };
    });

    // Calculate subtotal
    const subtotal = roundMoney(
      calculatedItems.reduce(
        (sum, item) => sum + item.amount,
        0
      )
    );

    // Tax is a percentage
    const taxRate = Number(tax);

    if (
      !Number.isFinite(taxRate) ||
      taxRate < 0
    ) {
      return res.status(400).json({
        message: "Invalid tax percentage",
      });
    }

    // Convert tax percentage into actual tax amount
    const taxAmount = roundMoney(
      subtotal * (taxRate / 100)
    );

    // Final invoice total
    const total = roundMoney(
      subtotal + taxAmount
    );

    const invoice = await Invoice.create({
      invoiceNumber: generateInvoiceNumber(),
      client,
      project: project || null,
      items: calculatedItems,
      subtotal,
      tax: taxRate,
      taxAmount,
      total,
      dueDate,
      user: req.user.userId,
    });

    res.status(201).json({
      message: "Invoice created successfully",
      invoice,
    });
  } catch (error) {
    console.error("Create invoice error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// Get all invoices
const getInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find({
      user: req.user.userId,
    })
      .populate("client", "name email company")
      .populate("project", "name status")
      .sort({ createdAt: -1 });

    res.status(200).json({
      invoices,
    });
  } catch (error) {
    console.error("Get invoices error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// Get one invoice
const getInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      user: req.user.userId,
    })
      .populate("client", "name email company")
      .populate("project", "name status");

    if (!invoice) {
      return res.status(404).json({
        message: "Invoice not found",
      });
    }

    res.status(200).json({
      invoice,
    });
  } catch (error) {
    console.error("Get invoice error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// Update invoice
const updateInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!invoice) {
      return res.status(404).json({
        message: "Invoice not found",
      });
    }

    // Don't modify a paid invoice
    if (invoice.status === "paid") {
      return res.status(400).json({
        message: "Paid invoices cannot be modified",
      });
    }

    const {
      client,
      project,
      items,
      tax,
      status,
      dueDate,
    } = req.body;

    // Update client/project
    if (client !== undefined || project !== undefined) {
      const newClient = client || invoice.client;
      const newProject =
        project !== undefined
          ? project
          : invoice.project;

      const existingClient = await Client.findOne({
        _id: newClient,
        user: req.user.userId,
      });

      if (!existingClient) {
        return res.status(404).json({
          message: "Client not found",
        });
      }

      if (newProject) {
        const existingProject = await Project.findOne({
          _id: newProject,
          user: req.user.userId,
        });

        if (!existingProject) {
          return res.status(404).json({
            message: "Project not found",
          });
        }

        if (
          existingProject.client.toString() !==
          newClient.toString()
        ) {
          return res.status(400).json({
            message:
              "Project does not belong to this client",
          });
        }

        invoice.project = newProject;
      } else {
        invoice.project = null;
      }

      invoice.client = newClient;
    }

    // Update items
    if (items !== undefined) {
      if (
        !Array.isArray(items) ||
        items.length === 0
      ) {
        return res.status(400).json({
          message:
            "Invoice must contain at least one item",
        });
      }

      const calculatedItems = items.map((item) => {
        const quantity = Number(item.quantity);
        const unitPrice = Number(item.unitPrice);

        if (
          !item.description ||
          !Number.isFinite(quantity) ||
          !Number.isFinite(unitPrice) ||
          quantity <= 0 ||
          unitPrice < 0
        ) {
          throw new Error("Invalid invoice item");
        }

        const amount = roundMoney(
          quantity * unitPrice
        );

        return {
          description: item.description.trim(),
          quantity,
          unitPrice: roundMoney(unitPrice),
          amount,
        };
      });

      invoice.items = calculatedItems;
    }

    // Update tax percentage
    if (tax !== undefined) {
      const taxRate = Number(tax);

      if (
        !Number.isFinite(taxRate) ||
        taxRate < 0
      ) {
        return res.status(400).json({
          message: "Invalid tax percentage",
        });
      }

      invoice.tax = taxRate;
    }

    if (status !== undefined) {
      invoice.status = status;
    }

    if (dueDate !== undefined) {
      invoice.dueDate = dueDate;
    }

    // Recalculate totals from the current invoice data
    const subtotal = roundMoney(
      invoice.items.reduce(
        (sum, item) =>
          sum +
          Number(item.quantity) *
            Number(item.unitPrice),
        0
      )
    );

    const taxRate = Number(invoice.tax) || 0;

    const taxAmount = roundMoney(
      subtotal * (taxRate / 100)
    );

    const total = roundMoney(
      subtotal + taxAmount
    );

    invoice.subtotal = subtotal;
    invoice.tax = taxRate;
    invoice.taxAmount = taxAmount;
    invoice.total = total;

    await invoice.save();

    res.status(200).json({
      message: "Invoice updated successfully",
      invoice,
    });
  } catch (error) {
    console.error("Update invoice error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// Delete invoice
const deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!invoice) {
      return res.status(404).json({
        message: "Invoice not found",
      });
    }

    if (invoice.status === "paid") {
      return res.status(400).json({
        message: "Paid invoices cannot be deleted",
      });
    }

    await invoice.deleteOne();

    res.status(200).json({
      message: "Invoice deleted successfully",
    });
  } catch (error) {
    console.error("Delete invoice error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

module.exports = {
  createInvoice,
  getInvoices,
  getInvoice,
  updateInvoice,
  deleteInvoice,
};