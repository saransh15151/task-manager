require("dotenv").config(); // load env FIRST

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

// ================= MIDDLEWARE =================
app.use(express.json());
app.use(cors());

// ================= DATABASE =================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("DB connected"))
  .catch(err => console.log(err));

// ================= MODELS =================

// USER
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: { type: String, default: "member" }
});

const User = mongoose.model("User", userSchema);

// TASK
const taskSchema = new mongoose.Schema({
  title: String,
  status: { type: String, default: "todo" },
  userId: String
});

const Task = mongoose.model("Task", taskSchema);

// ================= ROUTES =================

// TEST
app.get("/", (req, res) => {
  res.send("Server running");
});

// ================= SIGNUP =================
app.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).send("All fields required");

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).send("User already exists");

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashedPassword
    });

    await user.save();

    res.send("User registered successfully");
  } catch (error) {
    res.send("Error in signup");
  }
});

// ================= LOGIN =================
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.send("User not found");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.send("Invalid password");

    // ✅ CREATE TOKEN
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful",
      token
    });

  } catch (error) {
    res.send("Error in login");
  }
});

// ================= AUTH MIDDLEWARE =================
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) return res.send("No token");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.send("Invalid token");
  }
};

// ================= TASK APIs =================

// CREATE TASK
app.post("/task", authMiddleware, async (req, res) => {
  try {
    const { title } = req.body;

    const task = new Task({
      title,
      userId: req.user.id
    });

    await task.save();

    res.send("Task created");
  } catch (error) {
    res.send("Error creating task");
  }
});

// GET TASKS
app.get("/tasks", authMiddleware, async (req, res) => {
  const tasks = await Task.find({ userId: req.user.id });
  res.json(tasks);
});

// UPDATE TASK
app.put("/task/:id", authMiddleware, async (req, res) => {
  try {
    const { title, status } = req.body;

    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { title, status },
      { new: true }
    );

    if (!task) return res.send("Task not found");

    res.json(task);
  } catch (error) {
    res.send("Error updating task");
  }
});

// DELETE TASK
app.delete("/task/:id", authMiddleware, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!task) return res.send("Task not found");

    res.send("Task deleted");
  } catch (error) {
    res.send("Error deleting task");
  }
});

// ================= SERVER =================
app.listen(process.env.PORT || 5000, () => {
  console.log("Server started");
});