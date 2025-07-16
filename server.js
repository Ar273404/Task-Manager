const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "data.json");

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

// Initialize data file if it doesn't exist
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
}

// Helper function to read tasks from file
const readTasks = () => {
  try {
    const data = fs.readFileSync(DATA_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading tasks:", error);
    return [];
  }
};

// Helper function to write tasks to file
const writeTasks = (tasks) => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(tasks, null, 2));
    return true;
  } catch (error) {
    console.error("Error writing tasks:", error);
    return false;
  }
};

// API Routes

// GET /api/tasks - Get all tasks
app.get("/api/tasks", (req, res) => {
  try {
    const tasks = readTasks();
    res.json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching tasks",
      error: error.message,
    });
  }
});

// POST /api/tasks - Add a new task
app.post("/api/tasks", (req, res) => {
  try {
    const { title, dueDate } = req.body;

    // Validation
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Task title is required",
      });
    }

    if (!dueDate) {
      return res.status(400).json({
        success: false,
        message: "Due date is required",
      });
    }

    const tasks = readTasks();
    const newTask = {
      id: uuidv4(),
      title: title.trim(),
      dueDate: dueDate,
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    tasks.push(newTask);

    if (writeTasks(tasks)) {
      res.status(201).json({
        success: true,
        message: "Task created successfully",
        data: newTask,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Error saving task",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating task",
      error: error.message,
    });
  }
});

// PUT /api/tasks/:id - Update task status
app.put("/api/tasks/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !["pending", "completed"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Valid status is required (pending or completed)",
      });
    }

    const tasks = readTasks();
    const taskIndex = tasks.findIndex((task) => task.id === id);

    if (taskIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    tasks[taskIndex].status = status;
    tasks[taskIndex].updatedAt = new Date().toISOString();

    if (writeTasks(tasks)) {
      res.json({
        success: true,
        message: "Task updated successfully",
        data: tasks[taskIndex],
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Error updating task",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating task",
      error: error.message,
    });
  }
});

// DELETE /api/tasks/:id - Delete a task
app.delete("/api/tasks/:id", (req, res) => {
  try {
    const { id } = req.params;
    const tasks = readTasks();
    const taskIndex = tasks.findIndex((task) => task.id === id);

    if (taskIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const deletedTask = tasks.splice(taskIndex, 1)[0];

    if (writeTasks(tasks)) {
      res.json({
        success: true,
        message: "Task deleted successfully",
        data: deletedTask,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Error deleting task",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting task",
      error: error.message,
    });
  }
});

// Serve the frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Task Manager Server running on http://localhost:${PORT}`);
  console.log(`📁 Data file: ${DATA_FILE}`);
});
