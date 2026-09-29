const mongoose = require("mongoose");
const Invoice = require("../models/Invoice");
const Client = require("../models/Client");
const Project = require("../models/Project");

const generateInvoiceNumber = () => `INV-${Date.now()}`;

const roundMoney = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const validateMoney = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return false;
  }

  return (
    Math.abs(number * 100 - Math.round(number * 100)) <
    Number.EPSILON
  );
};

/*
|--------------------------------------------------------------------------
| CHECK IF INVOICE IS OVERDUE
|--------------------------------------------------------------------------
*/

const isInvoiceOverdue = (invoice) => {
  if (!invoice?.dueDate) {
    return false;
  }

  if (
    invoice.status === "paid" ||
    invoice.status === "cancelled" ||
    invoice.status === "draft"
  ) {
    return false;
  }

  const dueDate = new Date(invoice.dueDate);

  if (Number.isNaN(dueDate.getTime())) {
    return false;
  }

  /*
  |----------------------------------------------------------------------
  | Treat the due date as the end of that calendar day.
  |
  | Example:
  | Due date = September 29
  | Invoice remains "sent" throughout September 29.
  | It becomes "overdue" from September 30.
  |----------------------------------------------------------------------
  */

  dueDate.setHours(23, 59, 59, 999);

  const now = new Date();

  return dueDate < now;
};

/*
|--------------------------------------------------------------------------
| UPDATE OVERDUE STATUS
|--------------------------------------------------------------------------
*/

const updateOverdueStatus = async (invoice) => {
  if (!invoice) {
    return invoice;
  }

  /*
  |----------------------------------------------------------------------
  | Sent invoice whose due date has passed
  |----------------------------------------------------------------------
  */

  if (
    invoice.status === "sent" &&
    isInvoiceOverdue(invoice)
  ) {
    invoice.status = "overdue";
    await invoice.save();

    return invoice;
  }

  /*
  |----------------------------------------------------------------------
  | Overdue invoice whose due date has been moved into the future
  |
  | This is important when an invoice is edited.
  |----------------------------------------------------------------------
  */

  if (
    invoice.status === "overdue" &&
    !isInvoiceOverdue({
      ...invoice.toObject(),
      status: "sent",
    })
  ) {
    invoice.status = "sent";
    await invoice.save();

    return invoice;
  }

  return invoice;
};

const calculateInvoiceItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Invoice must contain at least one item");
  }

  return items.map((item) => {
    const description = String(item.description || "").trim();
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);

    if (!description) {
      throw new Error("Invoice item description is required");
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error(
        "Invoice item quantity must be greater than zero"
      );
    }

    if (
      !Number.isFinite(unitPrice) ||
      unitPrice < 0 ||
      !validateMoney(unitPrice)
    ) {
      throw new Error("Invalid invoice item price");
    }

    const amount = roundMoney(quantity * unitPrice);

    if (!validateMoney(amount)) {
      throw new Error("Invalid invoice item amount");
    }

    return {
      description,
      quantity,
      unitPrice: roundMoney(unitPrice),
      amount,
    };
  });
};

const calculateTotals = (items, taxRate) => {
  const subtotal = roundMoney(
    items.reduce(
      (sum, item) => sum + Number(item.amount),
      0
    )
  );

  const tax = Number(taxRate);

  if (!Number.isFinite(tax) || tax < 0 || tax > 100) {
    throw new Error(
      "Tax percentage must be between 0% and 100%"
    );
  }

  const taxAmount = roundMoney(
    subtotal * (tax / 100)
  );

  const total = roundMoney(
    subtotal + taxAmount
  );

  if (
    !validateMoney(subtotal) ||
    !validateMoney(taxAmount) ||
    !validateMoney(total)
  ) {
    throw new Error("Invalid invoice amount");
  }

  return {
    subtotal,
    tax,
    taxAmount,
    total,
  };
};

/*
|--------------------------------------------------------------------------
| CREATE INVOICE
|--------------------------------------------------------------------------
*/

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
        message:
          "Client, items and due date are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(client)) {
      return res.status(400).json({
        message: "Invalid client ID",
      });
    }

    if (
      project &&
      !mongoose.Types.ObjectId.isValid(project)
    ) {
      return res.status(400).json({
        message: "Invalid project ID",
      });
    }

    const parsedDueDate = new Date(dueDate);

    if (Number.isNaN(parsedDueDate.getTime())) {
      return res.status(400).json({
        message: "Invalid due date",
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

      if (
        !existingProject.client ||
        existingProject.client.toString() !==
          client.toString()
      ) {
        return res.status(400).json({
          message:
            "Project does not belong to this client",
        });
      }
    }

    const calculatedItems =
      calculateInvoiceItems(items);

    const totals = calculateTotals(
      calculatedItems,
      tax
    );

    const invoice = await Invoice.create({
      invoiceNumber: generateInvoiceNumber(),
      client,
      project: project || null,
      items: calculatedItems,
      subtotal: totals.subtotal,
      tax: totals.tax,
      taxAmount: totals.taxAmount,
      total: totals.total,
      dueDate: parsedDueDate,
      user: req.user.userId,
    });

    return res.status(201).json({
      message: "Invoice created successfully",
      invoice,
    });
  } catch (error) {
    console.error(
      "Create invoice error:",
      error
    );

    if (error.name === "ValidationError") {
      const messages = Object.values(
        error.errors || {}
      )
        .map(
          (validationError) =>
            validationError.message
        )
        .filter(Boolean);

      return res.status(400).json({
        message:
          messages[0] || "Invalid invoice data",
        errors: messages,
      });
    }

    if (error.name === "CastError") {
      return res.status(400).json({
        message: `Invalid value for ${
          error.path || "field"
        }`,
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        message:
          "An invoice with this invoice number already exists. Please try again.",
      });
    }

    const clientErrorMessages = [
      "Invoice must contain at least one item",
      "Invoice item description is required",
      "Invoice item quantity must be greater than zero",
      "Invalid invoice item price",
      "Invalid invoice item amount",
      "Tax percentage must be between 0% and 100%",
      "Invalid invoice amount",
      "Invoice item amount does not match quantity × unit price",
      "Invoice subtotal does not match invoice items",
      "Invoice tax amount does not match tax percentage",
      "Invoice total does not match subtotal + tax",
    ];

    if (
      clientErrorMessages.includes(error.message)
    ) {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Server error",
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET ALL INVOICES
|--------------------------------------------------------------------------
*/

const getInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find({
      user: req.user.userId,
    })
      .populate(
        "client",
        "name email company"
      )
      .populate(
        "project",
        "name status"
      )
      .sort({ createdAt: -1 });

    for (const invoice of invoices) {
      await updateOverdueStatus(invoice);
    }

    return res.status(200).json({
      invoices,
    });
  } catch (error) {
    console.error(
      "Get invoices error:",
      error
    );

    return res.status(500).json({
      message: "Server error",
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET SINGLE INVOICE
|--------------------------------------------------------------------------
*/

const getInvoice = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid invoice ID",
      });
    }

    const invoice = await Invoice.findOne({
      _id: id,
      user: req.user.userId,
    })
      .populate(
        "client",
        "name email company phone address"
      )
      .populate(
        "project",
        "name status"
      );

    if (!invoice) {
      return res.status(404).json({
        message: "Invoice not found",
      });
    }

    await updateOverdueStatus(invoice);

    return res.status(200).json({
      invoice,
    });
  } catch (error) {
    console.error(
      "Get invoice error:",
      error
    );

    return res.status(500).json({
      message: "Server error",
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET PUBLIC INVOICE
|--------------------------------------------------------------------------
*/

const getPublicInvoice = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token || typeof token !== "string") {
      return res.status(400).json({
        message: "Invalid invoice token",
      });
    }

    const invoice = await Invoice.findOne({
      publicToken: token,
    })
      .populate(
        "client",
        "name email company phone address"
      )
      .populate(
        "project",
        "name status"
      )
      .populate(
        "user",
        "firstName lastName email"
      );

    if (!invoice) {
      return res.status(404).json({
        message: "Invoice not found",
      });
    }

    await updateOverdueStatus(invoice);

    return res.status(200).json({
      invoice: {
        _id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        client: invoice.client,
        project: invoice.project,
        items: invoice.items,
        subtotal: invoice.subtotal,
        tax: invoice.tax,
        taxAmount: invoice.taxAmount,
        total: invoice.total,
        status: invoice.status,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        user: invoice.user,
      },
    });
  } catch (error) {
    console.error(
      "Get public invoice error:",
      error
    );

    return res.status(500).json({
      message: "Server error",
    });
  }
};

/*
|--------------------------------------------------------------------------
| SEND INVOICE
|--------------------------------------------------------------------------
*/

const sendInvoice = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid invoice ID",
      });
    }

    const invoice = await Invoice.findOne({
      _id: id,
      user: req.user.userId,
    })
      .populate(
        "client",
        "name email company phone address"
      )
      .populate(
        "project",
        "name status"
      );

    if (!invoice) {
      return res.status(404).json({
        message: "Invoice not found",
      });
    }

    if (invoice.status === "paid") {
      return res.status(400).json({
        message:
          "Paid invoices cannot be sent again.",
      });
    }

    if (invoice.status === "cancelled") {
      return res.status(400).json({
        message:
          "Cancelled invoices cannot be sent.",
      });
    }

    if (invoice.status === "overdue") {
      return res.status(400).json({
        message:
          "Overdue invoices should be reminded instead of sent again.",
      });
    }

    if (invoice.status === "sent") {
      return res.status(200).json({
        message: "Invoice is already marked as sent.",
        invoice,
      });
    }

    invoice.status = "sent";

    await invoice.save();

    return res.status(200).json({
      message: "Invoice marked as sent successfully",
      invoice,
    });
  } catch (error) {
    console.error(
      "Send invoice error:",
      error
    );

    return res.status(500).json({
      message: "Server error",
    });
  }
};

/*
|--------------------------------------------------------------------------
| SEND REMINDER
|--------------------------------------------------------------------------
*/

const sendReminder = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid invoice ID",
      });
    }

    const invoice = await Invoice.findOne({
      _id: id,
      user: req.user.userId,
    })
      .populate(
        "client",
        "name email company phone address"
      )
      .populate(
        "project",
        "name status"
      );

    if (!invoice) {
      return res.status(404).json({
        message: "Invoice not found",
      });
    }

    if (invoice.status === "paid") {
      return res.status(400).json({
        message:
          "Paid invoices do not need a reminder.",
      });
    }

    if (invoice.status === "cancelled") {
      return res.status(400).json({
        message:
          "Cancelled invoices cannot be reminded.",
      });
    }

    if (invoice.status === "draft") {
      return res.status(400).json({
        message:
          "Draft invoices must be sent before sending a reminder.",
      });
    }

    const now = new Date();
    const dueDate = new Date(invoice.dueDate);

    if (Number.isNaN(dueDate.getTime())) {
      return res.status(400).json({
        message: "Invoice has an invalid due date.",
      });
    }

    dueDate.setHours(23, 59, 59, 999);

    if (dueDate >= now) {
      return res.status(400).json({
        message:
          "This invoice is not overdue yet.",
      });
    }

    if (invoice.status === "sent") {
      invoice.status = "overdue";
      await invoice.save();
    }

    return res.status(200).json({
      message:
        "Invoice reminder is ready to be shared.",
      invoice,
      publicToken: invoice.publicToken,
    });
  } catch (error) {
    console.error(
      "Send reminder error:",
      error
    );

    return res.status(500).json({
      message: "Server error",
    });
  }
};

/*
|--------------------------------------------------------------------------
| UPDATE INVOICE
|--------------------------------------------------------------------------
*/

const updateInvoice = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid invoice ID",
      });
    }

    const invoice = await Invoice.findOne({
      _id: id,
      user: req.user.userId,
    });

    if (!invoice) {
      return res.status(404).json({
        message: "Invoice not found",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Paid invoices cannot be edited
    |--------------------------------------------------------------------------
    */

    if (invoice.status === "paid") {
      return res.status(400).json({
        message:
          "Paid invoices cannot be modified",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Cancelled invoices cannot be edited
    |--------------------------------------------------------------------------
    */

    if (invoice.status === "cancelled") {
      return res.status(400).json({
        message:
          "Cancelled invoices cannot be modified",
      });
    }

    const {
      client,
      project,
      items,
      tax = 0,
      dueDate,
      status,
    } = req.body;

    if (!client || !items || !dueDate) {
      return res.status(400).json({
        message:
          "Client, items and due date are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(client)) {
      return res.status(400).json({
        message: "Invalid client ID",
      });
    }

    if (
      project &&
      !mongoose.Types.ObjectId.isValid(project)
    ) {
      return res.status(400).json({
        message: "Invalid project ID",
      });
    }

    const parsedDueDate = new Date(dueDate);

    if (Number.isNaN(parsedDueDate.getTime())) {
      return res.status(400).json({
        message: "Invalid due date",
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

      if (
        !existingProject.client ||
        existingProject.client.toString() !==
          client.toString()
      ) {
        return res.status(400).json({
          message:
            "Project does not belong to this client",
        });
      }
    }

    const calculatedItems =
      calculateInvoiceItems(items);

    const totals = calculateTotals(
      calculatedItems,
      tax
    );

    /*
    |--------------------------------------------------------------------------
    | Preserve the original status before changing anything
    |--------------------------------------------------------------------------
    */

    const originalStatus = invoice.status;

    invoice.client = client;
    invoice.project = project || null;
    invoice.items = calculatedItems;
    invoice.subtotal = totals.subtotal;
    invoice.tax = totals.tax;
    invoice.taxAmount = totals.taxAmount;
    invoice.total = totals.total;
    invoice.dueDate = parsedDueDate;

    /*
    |--------------------------------------------------------------------------
    | Status handling
    |--------------------------------------------------------------------------
    |
    | If the invoice is being edited:
    |
    | sent + past due date    -> overdue
    | sent + future due date  -> sent
    | overdue + future date  -> sent
    | overdue + past date    -> overdue
    |
    | Draft remains draft.
    |
    | Paid/cancelled were already blocked above.
    |--------------------------------------------------------------------------
    */

    if (originalStatus === "draft") {
      invoice.status = "draft";
    } else if (
      originalStatus === "sent" ||
      originalStatus === "overdue"
    ) {
      const dueDateForStatus = new Date(
        parsedDueDate
      );

      dueDateForStatus.setHours(
        23,
        59,
        59,
        999
      );

      const now = new Date();

      if (dueDateForStatus < now) {
        invoice.status = "overdue";
      } else {
        invoice.status = "sent";
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Optional manual status handling
    |--------------------------------------------------------------------------
    |
    | We intentionally do not allow the frontend to manually turn
    | an invoice into "paid".
    |
    | For sent/overdue invoices, the due date determines the status.
    |--------------------------------------------------------------------------
    */

    if (status) {
      const allowedStatuses = [
        "draft",
        "sent",
        "paid",
        "overdue",
        "cancelled",
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          message: "Invalid invoice status",
        });
      }

      if (
        status === "paid" &&
        originalStatus !== "paid"
      ) {
        return res.status(400).json({
          message:
            "Invoices can only be marked as paid after successful payment.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Do not allow manual status changes that conflict with the
      | automatic due-date status.
      |--------------------------------------------------------------------------
      */

      if (
        (originalStatus === "sent" ||
          originalStatus === "overdue") &&
        (status === "sent" ||
          status === "overdue")
      ) {
        // Keep the automatically calculated status.
      } else if (
        status === "draft"
      ) {
        invoice.status = "draft";
      } else if (
        status === "cancelled"
      ) {
        invoice.status = "cancelled";
      }
    }

    await invoice.save();

    const updatedInvoice =
      await Invoice.findById(invoice._id)
        .populate(
          "client",
          "name email company phone address"
        )
        .populate(
          "project",
          "name status"
        );

    return res.status(200).json({
      message: "Invoice updated successfully",
      invoice: updatedInvoice,
    });
  } catch (error) {
    console.error(
      "Update invoice error:",
      error
    );

    if (error.name === "ValidationError") {
      const messages = Object.values(
        error.errors || {}
      )
        .map(
          (validationError) =>
            validationError.message
        )
        .filter(Boolean);

      return res.status(400).json({
        message:
          messages[0] || "Invalid invoice data",
        errors: messages,
      });
    }

    if (error.name === "CastError") {
      return res.status(400).json({
        message: `Invalid value for ${
          error.path || "field"
        }`,
      });
    }

    const clientErrorMessages = [
      "Invoice must contain at least one item",
      "Invoice item description is required",
      "Invoice item quantity must be greater than zero",
      "Invalid invoice item price",
      "Invalid invoice item amount",
      "Tax percentage must be between 0% and 100%",
      "Invalid invoice amount",
      "Invoice item amount does not match quantity × unit price",
      "Invoice subtotal does not match invoice items",
      "Invoice tax amount does not match tax percentage",
      "Invoice total does not match subtotal + tax",
    ];

    if (
      clientErrorMessages.includes(error.message)
    ) {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Server error",
    });
  }
};

/*
|--------------------------------------------------------------------------
| DELETE INVOICE
|--------------------------------------------------------------------------
*/

const deleteInvoice = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid invoice ID",
      });
    }

    const invoice = await Invoice.findOne({
      _id: id,
      user: req.user.userId,
    });

    if (!invoice) {
      return res.status(404).json({
        message: "Invoice not found",
      });
    }

    if (invoice.status === "paid") {
      return res.status(400).json({
        message:
          "Paid invoices cannot be deleted",
      });
    }

    await Invoice.deleteOne({
      _id: id,
      user: req.user.userId,
    });

    return res.status(200).json({
      message: "Invoice deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete invoice error:",
      error
    );

    return res.status(500).json({
      message: "Server error",
    });
  }
};

module.exports = {
  createInvoice,
  getInvoices,
  getInvoice,
  getPublicInvoice,
  sendInvoice,
  sendReminder,
  updateInvoice,
  deleteInvoice,
};