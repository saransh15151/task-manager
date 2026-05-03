require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Import models
const User = require("./models/user");
const Task = require("./models/task");
const Project = require("./models/project");

const app = express();

// ================= MIDDLEWARE =================
app.use(express.json());
app.use(cors());

// ================= DATABASE =================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("DB connected"))
  .catch(err => console.log(err));

// ================= AUTH MIDDLEWARE =================
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ error: "No token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// Project member check middleware
const projectMember = async (req, res, next) => {
  try {
    const projectId = req.params.id || req.params.projectId;
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: "Project not found" });

    const isMember = project.members.some(
      m => m.user.toString() === req.user.id
    );
    if (!isMember) return res.status(403).json({ error: "Not a project member" });

    req.project = project;
    next();
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// Project admin check middleware
const projectAdmin = async (req, res, next) => {
  try {
    const projectId = req.params.id || req.params.projectId;
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: "Project not found" });

    const member = project.members.find(
      m => m.user.toString() === req.user.id
    );
    if (!member || member.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    req.project = project;
    next();
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// ================= ROUTES =================

app.get("/", (req, res) => {
  res.send("Server running");
});

// ================= AUTH =================

// SIGNUP
app.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ error: "All fields required" });

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ error: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashedPassword
    });

    await user.save();
    res.json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error in signup" });
  }
});

// LOGIN
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid password" });

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Error in login" });
  }
});

// GET CURRENT USER
app.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ================= PROJECT APIs =================

// CREATE PROJECT
app.post("/projects", authMiddleware, async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title) return res.status(400).json({ error: "Title required" });

    const project = new Project({
      title,
      description: description || "",
      owner: req.user.id,
      members: [{ user: req.user.id, role: "admin" }]
    });

    await project.save();
    const populated = await Project.findById(project._id)
      .populate("members.user", "name email")
      .populate("owner", "name email");

    res.json(populated);
  } catch (error) {
    res.status(500).json({ error: "Error creating project" });
  }
});

// GET ALL PROJECTS (user belongs to)
app.get("/projects", authMiddleware, async (req, res) => {
  try {
    const projects = await Project.find({
      "members.user": req.user.id
    })
      .populate("members.user", "name email")
      .populate("owner", "name email")
      .sort({ createdAt: -1 });

    // Attach task stats to each project
    const projectsWithStats = await Promise.all(
      projects.map(async (project) => {
        const tasks = await Task.find({ projectId: project._id });
        const total = tasks.length;
        const done = tasks.filter(t => t.status === "done").length;
        const inProgress = tasks.filter(t => t.status === "in-progress").length;
        const todo = tasks.filter(t => t.status === "todo").length;

        return {
          ...project.toObject(),
          stats: { total, done, inProgress, todo }
        };
      })
    );

    res.json(projectsWithStats);
  } catch (error) {
    res.status(500).json({ error: "Error fetching projects" });
  }
});

// GET SINGLE PROJECT
app.get("/projects/:id", authMiddleware, projectMember, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate("members.user", "name email")
      .populate("owner", "name email");

    res.json(project);
  } catch (error) {
    res.status(500).json({ error: "Error fetching project" });
  }
});

// DELETE PROJECT
app.delete("/projects/:id", authMiddleware, projectAdmin, async (req, res) => {
  try {
    await Task.deleteMany({ projectId: req.params.id });
    await Project.findByIdAndDelete(req.params.id);
    res.json({ message: "Project deleted" });
  } catch (error) {
    res.status(500).json({ error: "Error deleting project" });
  }
});

// ADD MEMBER TO PROJECT
app.post("/projects/:id/members", authMiddleware, projectAdmin, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });

    const userToAdd = await User.findOne({ email });
    if (!userToAdd) return res.status(404).json({ error: "User not found. They must sign up first." });

    const project = req.project;
    const alreadyMember = project.members.some(
      m => m.user.toString() === userToAdd._id.toString()
    );
    if (alreadyMember) return res.status(400).json({ error: "User is already a member" });

    project.members.push({ user: userToAdd._id, role: "member" });
    await project.save();

    const updated = await Project.findById(project._id)
      .populate("members.user", "name email")
      .populate("owner", "name email");

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Error adding member" });
  }
});

// REMOVE MEMBER FROM PROJECT
app.delete("/projects/:id/members/:userId", authMiddleware, projectAdmin, async (req, res) => {
  try {
    const project = req.project;

    // Can't remove the owner
    if (project.owner.toString() === req.params.userId) {
      return res.status(400).json({ error: "Cannot remove the project owner" });
    }

    project.members = project.members.filter(
      m => m.user.toString() !== req.params.userId
    );
    await project.save();

    // Unassign tasks from removed member
    await Task.updateMany(
      { projectId: project._id, assignedTo: req.params.userId },
      { assignedTo: null }
    );

    const updated = await Project.findById(project._id)
      .populate("members.user", "name email")
      .populate("owner", "name email");

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Error removing member" });
  }
});

// ================= TASK APIs =================

// CREATE TASK IN PROJECT
app.post("/projects/:id/tasks", authMiddleware, projectMember, async (req, res) => {
  try {
    const { title, description, priority, assignedTo, dueDate } = req.body;
    if (!title) return res.status(400).json({ error: "Title required" });

    // If assigning, verify assignee is project member
    if (assignedTo) {
      const isMember = req.project.members.some(
        m => m.user.toString() === assignedTo
      );
      if (!isMember) return res.status(400).json({ error: "Assignee is not a project member" });
    }

    const task = new Task({
      title,
      description: description || "",
      priority: priority || "medium",
      assignedTo: assignedTo || null,
      projectId: req.params.id,
      createdBy: req.user.id,
      dueDate: dueDate || null
    });

    await task.save();

    const populated = await Task.findById(task._id)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email");

    res.json(populated);
  } catch (error) {
    res.status(500).json({ error: "Error creating task" });
  }
});

// GET TASKS FOR PROJECT
app.get("/projects/:id/tasks", authMiddleware, projectMember, async (req, res) => {
  try {
    const tasks = await Task.find({ projectId: req.params.id })
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: "Error fetching tasks" });
  }
});

// UPDATE TASK
app.put("/tasks/:id", authMiddleware, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: "Task not found" });

    // Check user is member of the task's project
    const project = await Project.findById(task.projectId);
    if (!project) return res.status(404).json({ error: "Project not found" });

    const isMember = project.members.some(
      m => m.user.toString() === req.user.id
    );
    if (!isMember) return res.status(403).json({ error: "Not a project member" });

    const { title, description, status, priority, assignedTo, dueDate } = req.body;

    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (status !== undefined) task.status = status;
    if (priority !== undefined) task.priority = priority;
    if (assignedTo !== undefined) task.assignedTo = assignedTo || null;
    if (dueDate !== undefined) task.dueDate = dueDate || null;

    await task.save();

    const populated = await Task.findById(task._id)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email");

    res.json(populated);
  } catch (error) {
    res.status(500).json({ error: "Error updating task" });
  }
});

// DELETE TASK
app.delete("/tasks/:id", authMiddleware, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: "Task not found" });

    // Check user is admin of the task's project
    const project = await Project.findById(task.projectId);
    if (!project) return res.status(404).json({ error: "Project not found" });

    const member = project.members.find(
      m => m.user.toString() === req.user.id
    );
    if (!member || member.role !== "admin") {
      return res.status(403).json({ error: "Admin access required to delete tasks" });
    }

    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: "Task deleted" });
  } catch (error) {
    res.status(500).json({ error: "Error deleting task" });
  }
});

// GET PROJECT PROGRESS
app.get("/projects/:id/progress", authMiddleware, projectMember, async (req, res) => {
  try {
    const tasks = await Task.find({ projectId: req.params.id });
    const total = tasks.length;
    const done = tasks.filter(t => t.status === "done").length;
    const inProgress = tasks.filter(t => t.status === "in-progress").length;
    const todo = tasks.filter(t => t.status === "todo").length;
    const percentage = total > 0 ? Math.round((done / total) * 100) : 0;

    res.json({ total, done, inProgress, todo, percentage });
  } catch (error) {
    res.status(500).json({ error: "Error fetching progress" });
  }
});

// ================= LEGACY TASK APIs (backward compat) =================

// GET TASKS (personal - legacy)
app.get("/tasks", authMiddleware, async (req, res) => {
  try {
    const tasks = await Task.find({ createdBy: req.user.id })
      .populate("assignedTo", "name email")
      .sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.json([]);
  }
});

// ================= SERVER =================
app.listen(process.env.PORT || 5000, () => {
  console.log("Server started on port " + (process.env.PORT || 5000));
});