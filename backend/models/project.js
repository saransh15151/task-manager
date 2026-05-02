const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema({
  title: String,
  members: [String]
});

module.exports = mongoose.model("Project", projectSchema);