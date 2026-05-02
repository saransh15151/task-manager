const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  title: String,
  status: { type: String, default: "todo" },
  assignedTo: String,
  projectId: String
});

module.exports = mongoose.model("Task", taskSchema);
