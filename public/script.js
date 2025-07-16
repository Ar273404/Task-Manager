class TaskManager {
  constructor() {
    this.tasks = [];
    this.filteredTasks = [];
    this.currentFilter = "all";
    this.currentSearch = "";
    this.taskToDelete = null;
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadTasks();
    this.setMinDate();
  }

  bindEvents() {
    // Form submission
    document.getElementById("taskForm").addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleAddTask();
    });

    // Filter change
    document.getElementById("statusFilter").addEventListener("change", (e) => {
      this.currentFilter = e.target.value;
      this.filterTasks();
    });

    // Search input
    document.getElementById("searchInput").addEventListener("input", (e) => {
      this.currentSearch = e.target.value.toLowerCase();
      this.filterTasks();
    });

    // Modal events
    document.getElementById("cancelDelete").addEventListener("click", () => {
      this.hideConfirmModal();
    });

    document.getElementById("confirmDelete").addEventListener("click", () => {
      this.deleteTask(this.taskToDelete);
      this.hideConfirmModal();
    });

    // Close modal on backdrop click
    document.getElementById("confirmModal").addEventListener("click", (e) => {
      if (e.target.id === "confirmModal") {
        this.hideConfirmModal();
      }
    });
  }

  setMinDate() {
    const today = new Date().toISOString().split("T")[0];
    document.getElementById("taskDueDate").setAttribute("min", today);
  }

  async loadTasks() {
    try {
      this.showLoading();
      const response = await fetch("/api/tasks");
      const result = await response.json();

      if (result.success) {
        this.tasks = result.data;
        this.filterTasks();
        this.updateTaskCount();
      } else {
        this.showToast("Error loading tasks", "error");
      }
    } catch (error) {
      console.error("Error loading tasks:", error);
      this.showToast("Error loading tasks", "error");
    } finally {
      this.hideLoading();
    }
  }

  async handleAddTask() {
    const form = document.getElementById("taskForm");
    const formData = new FormData(form);
    const title = formData.get("title").trim();
    const dueDate = formData.get("dueDate");

    // Reset previous errors
    this.clearErrors();

    // Validation
    if (!title) {
      this.showError("titleError", "Task title is required");
      return;
    }

    if (!dueDate) {
      this.showError("dueDateError", "Due date is required");
      return;
    }

    // Check if due date is in the past
    const today = new Date();
    const selectedDate = new Date(dueDate);
    if (selectedDate < today.setHours(0, 0, 0, 0)) {
      this.showError("dueDateError", "Due date cannot be in the past");
      return;
    }

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title, dueDate }),
      });

      const result = await response.json();

      if (result.success) {
        this.tasks.push(result.data);
        this.filterTasks();
        this.updateTaskCount();
        form.reset();
        this.showToast("Task added successfully!", "success");
      } else {
        this.showToast(result.message || "Error adding task", "error");
      }
    } catch (error) {
      console.error("Error adding task:", error);
      this.showToast("Error adding task", "error");
    }
  }

  async updateTaskStatus(taskId, newStatus) {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await response.json();

      if (result.success) {
        const taskIndex = this.tasks.findIndex((task) => task.id === taskId);
        if (taskIndex !== -1) {
          this.tasks[taskIndex] = result.data;
          this.filterTasks();
          this.updateTaskCount();

          const message =
            newStatus === "completed"
              ? "Task marked as completed!"
              : "Task marked as pending!";
          this.showToast(message, "success");
        }
      } else {
        this.showToast(result.message || "Error updating task", "error");
      }
    } catch (error) {
      console.error("Error updating task:", error);
      this.showToast("Error updating task", "error");
    }
  }

  async deleteTask(taskId) {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        this.tasks = this.tasks.filter((task) => task.id !== taskId);
        this.filterTasks();
        this.updateTaskCount();
        this.showToast("Task deleted successfully!", "success");
      } else {
        this.showToast(result.message || "Error deleting task", "error");
      }
    } catch (error) {
      console.error("Error deleting task:", error);
      this.showToast("Error deleting task", "error");
    }
  }

  showDeleteConfirmation(taskId) {
    this.taskToDelete = taskId;
    document.getElementById("confirmModal").classList.remove("hidden");
  }

  hideConfirmModal() {
    document.getElementById("confirmModal").classList.add("hidden");
    this.taskToDelete = null;
  }

  filterTasks() {
    let filtered = [...this.tasks];

    // Filter by status
    if (this.currentFilter !== "all") {
      filtered = filtered.filter((task) => task.status === this.currentFilter);
    }

    // Filter by search
    if (this.currentSearch) {
      filtered = filtered.filter((task) =>
        task.title.toLowerCase().includes(this.currentSearch)
      );
    }

    // Sort by due date
    filtered.sort((a, b) => {
      // Pending tasks first, then completed
      if (a.status !== b.status) {
        return a.status === "pending" ? -1 : 1;
      }
      return new Date(a.dueDate) - new Date(b.dueDate);
    });

    this.filteredTasks = filtered;
    this.renderTasks();
  }

  renderTasks() {
    const tasksList = document.getElementById("tasksList");
    const emptyState = document.getElementById("emptyState");

    if (this.filteredTasks.length === 0) {
      tasksList.innerHTML = "";
      emptyState.classList.remove("hidden");
      return;
    }

    emptyState.classList.add("hidden");

    tasksList.innerHTML = this.filteredTasks
      .map((task) => {
        const taskClass = this.getTaskClass(task);
        const statusIcon =
          task.status === "completed"
            ? '<i class="fas fa-check-circle text-success"></i>'
            : '<i class="fas fa-clock text-warning"></i>';

        const dueDateFormatted = new Date(task.dueDate).toLocaleDateString(
          "en-US",
          {
            year: "numeric",
            month: "short",
            day: "numeric",
          }
        );

        const isOverdue = this.isOverdue(task);
        const isDueSoon = this.isDueSoon(task);

        return `
                <div class="task-card bg-white rounded-lg p-6 border ${taskClass} fade-in">
                    <div class="flex items-start justify-between">
                        <div class="flex-1">
                            <div class="flex items-center space-x-3 mb-2">
                                ${statusIcon}
                                <h3 class="text-lg font-semibold text-gray-800 ${
                                  task.status === "completed"
                                    ? "line-through text-gray-500"
                                    : ""
                                }">${task.title}</h3>
                            </div>
                            
                            <div class="flex items-center space-x-4 text-sm text-gray-600">
                                <span class="flex items-center space-x-1">
                                    <i class="fas fa-calendar-alt"></i>
                                    <span>Due: ${dueDateFormatted}</span>
                                </span>
                                
                                <span class="flex items-center space-x-1">
                                    <i class="fas fa-tag"></i>
                                    <span class="capitalize ${this.getStatusColor(
                                      task.status
                                    )}">${task.status}</span>
                                </span>
                                
                                ${
                                  isOverdue && task.status !== "completed"
                                    ? '<span class="text-red-500 font-medium">Overdue</span>'
                                    : ""
                                }
                                ${
                                  isDueSoon && task.status !== "completed"
                                    ? '<span class="text-yellow-500 font-medium">Due Soon</span>'
                                    : ""
                                }
                            </div>
                        </div>
                        
                        <div class="flex items-center space-x-2 ml-4">
                            <button 
                                onclick="taskManager.updateTaskStatus('${
                                  task.id
                                }', '${
          task.status === "completed" ? "pending" : "completed"
        }')"
                                class="p-2 rounded-full transition-colors ${
                                  task.status === "completed"
                                    ? "text-yellow-500 hover:bg-yellow-50"
                                    : "text-green-500 hover:bg-green-50"
                                }"
                                title="${
                                  task.status === "completed"
                                    ? "Mark as pending"
                                    : "Mark as completed"
                                }"
                            >
                                <i class="fas ${
                                  task.status === "completed"
                                    ? "fa-undo"
                                    : "fa-check"
                                }"></i>
                            </button>
                            
                            <button 
                                onclick="taskManager.showDeleteConfirmation('${
                                  task.id
                                }')"
                                class="p-2 rounded-full text-red-500 hover:bg-red-50 transition-colors"
                                title="Delete task"
                            >
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
      })
      .join("");
  }

  getTaskClass(task) {
    if (task.status === "completed") {
      return "completed";
    } else if (this.isOverdue(task)) {
      return "overdue";
    } else if (this.isDueSoon(task)) {
      return "due-soon";
    }
    return "pending";
  }

  getStatusColor(status) {
    return status === "completed" ? "text-green-600" : "text-blue-600";
  }

  isOverdue(task) {
    if (task.status === "completed") return false;
    const today = new Date();
    const dueDate = new Date(task.dueDate);
    return dueDate < today.setHours(0, 0, 0, 0);
  }

  isDueSoon(task) {
    if (task.status === "completed") return false;
    const today = new Date();
    const dueDate = new Date(task.dueDate);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3 && diffDays >= 0;
  }

  updateTaskCount() {
    document.getElementById("taskCount").textContent = this.tasks.length;
  }

  showLoading() {
    document.getElementById("loading").classList.remove("hidden");
  }

  hideLoading() {
    document.getElementById("loading").classList.add("hidden");
  }

  showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    errorElement.textContent = message;
    errorElement.classList.remove("hidden");
  }

  clearErrors() {
    const errors = ["titleError", "dueDateError"];
    errors.forEach((id) => {
      const element = document.getElementById(id);
      element.classList.add("hidden");
      element.textContent = "";
    });
  }

  showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    const toastMessage = document.getElementById("toastMessage");

    toastMessage.textContent = message;

    // Set toast color based on type
    toast.className = `fixed top-4 right-4 px-6 py-4 rounded-lg shadow-lg transform translate-x-full transition-transform duration-300 z-50 ${
      type === "success" ? "bg-success text-white" : "bg-error text-white"
    }`;

    // Show toast
    toast.classList.remove("translate-x-full");

    // Hide toast after 3 seconds
    setTimeout(() => {
      toast.classList.add("translate-x-full");
    }, 3000);
  }
}

// Initialize the task manager when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.taskManager = new TaskManager();
});
