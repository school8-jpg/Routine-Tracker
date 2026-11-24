
const $ = (id) => document.getElementById(id);

const STORAGE_KEY = "LIFE_OS_DATA";

const today = new Date().toLocaleDateString("en-CA");

const defaultData = {
  date: today,
  tasks: [
    { id: 1, name: "अभ्यास पूर्ण करणे", done: false },
    { id: 2, name: "Running / Workout", done: false },
    { id: 3, name: "वेळेवर झोपणे", done: false }
  ],
  water: 0,
  study: 0,
  running: 0,
  meals: [],
  logs: [],
  streak: 0
};

let data;

try {
  data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultData;
} catch {
  data = defaultData;
}

if (data.date !== today) {
  data.date = today;
  data.water = 0;
  data.study = 0;
  data.running = 0;
  data.meals = [];
  data.logs = [];
  data.tasks = data.tasks.map(task => ({
    ...task,
    done: false
  }));
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  render();
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function showMessage(message) {
  const toast = $("toast");

  if (!toast) {
    alert(message);
    return;
  }

  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2000);
}

function render() {
  const completed = data.tasks.filter(task => task.done).length;
  const total = data.tasks.length;

  if ($("taskCount")) {
    $("taskCount").textContent = `${completed}/${total}`;
  }

  if ($("completion")) {
    $("completion").textContent =
      (total ? Math.round(completed / total * 100) : 0) + "%";
  }

  if ($("streak")) {
    $("streak").textContent = data.streak;
  }

  if ($("waterStat")) {
    $("waterStat").textContent = `${data.water} / 8`;
  }

  if ($("waterCount")) {
    $("waterCount").textContent =
      `${data.water}/8 ग्लास`;
  }

  if ($("waterBar")) {
    $("waterBar").style.width =
      Math.min(100, data.water / 8 * 100) + "%";
  }

  if ($("studyTime")) {
    $("studyTime").textContent =
      data.study + " मिनिटे";
  }

  if ($("runDistance")) {
    $("runDistance").textContent =
      data.running.toFixed(2) + " km";
  }

  if ($("mealCount")) {
    $("mealCount").textContent =
      data.meals.length + " नोंदी";
  }

  renderTasks();
  renderLogs();
}

function renderTasks() {
  const container = $("taskList");
  if (!container) return;

  if (!data.tasks.length) {
    container.innerHTML =
      '<p class="muted">अजून कामे जोडलेली नाहीत.</p>';
    return;
  }

  container.innerHTML = data.tasks.map(task => `
    <div class="task-row ${task.done ? "done" : ""}">
      <input
        type="checkbox"
        data-task-id="${task.id}"
        ${task.done ? "checked" : ""}
      >

      <span class="task-name">
        ${escapeHTML(task.name)}
      </span>

      <button
        class="delete-task"
        data-delete-id="${task.id}"
        aria-label="Delete task"
      >×</button>
    </div>
  `).join("");
}

function renderLogs() {
  const container = $("logs");
  if (!container) return;

  const entries = [
    ...data.logs,
    ...data.meals.map(meal => ({
      title: "जेवण: " + meal.name,
      detail: meal.type
    }))
  ];

  if (!entries.length) {
    container.innerHTML =
      '<p class="muted">अजून नोंदी नाहीत.</p>';
    return;
  }

  container.innerHTML = entries.slice().reverse().map(log => `
    <div class="log-row">
      ${escapeHTML(log.title)}
      <small>${escapeHTML(log.detail || "")}</small>
    </div>
  `).join("");
}

// Add task
if ($("addTaskBtn")) {
  $("addTaskBtn").addEventListener("click", () => {
    const name = prompt("कामाचे नाव लिहा:");

    if (!name || !name.trim()) return;

    data.tasks.push({
      id: Date.now(),
      name: name.trim(),
      done: false
    });

    saveData();
    showMessage("काम जोडले!");
  });
}

// Complete or delete task
if ($("taskList")) {
  $("taskList").addEventListener("change", event => {
    if (!event.target.matches("[data-task-id]")) return;

    const task = data.tasks.find(
      item => item.id == event.target.dataset.taskId
    );

    if (!task) return;

    task.done = event.target.checked;
    saveData();
  });

  $("taskList").addEventListener("click", event => {
    const id = event.target.dataset.deleteId;
    if (!id) return;

    data.tasks = data.tasks.filter(
      task => task.id != id
    );

    saveData();
    showMessage("काम हटवले!");
  });
}

// Water tracker
if ($("waterPlus")) {
  $("waterPlus").addEventListener("click", () => {
    data.water = Math.min(20, data.water + 1);
    saveData();
  });
}

if ($("waterMinus")) {
  $("waterMinus").addEventListener("click", () => {
    data.water = Math.max(0, data.water - 1);
    saveData();
  });
}

// Study tracker
if ($("studyBtn")) {
  $("studyBtn").addEventListener("click", () => {
    const minutes = Number(
      prompt("आज किती मिनिटे अभ्यास केला?")
    );

    if (!Number.isFinite(minutes) || minutes <= 0) {
      showMessage("योग्य वेळ टाका.");
      return;
    }

    data.study += Math.round(minutes);

    data.logs.push({
      title: "अभ्यास: " + Math.round(minutes) + " मिनिटे",
      detail: "Study"
    });

    saveData();
  });
}

// Running tracker
if ($("runBtn")) {
  $("runBtn").addEventListener("click", () => {
    const distance = Number(
      prompt("आज किती किलोमीटर धावलास?")
    );

    if (!Number.isFinite(distance) || distance <= 0) {
      showMessage("योग्य अंतर टाका.");
      return;
    }

    data.running += distance;

    data.logs.push({
      title: "Running: " + distance + " km",
      detail: "Running"
    });

    saveData();
  });
}

// Meal tracker
if ($("mealBtn")) {
  $("mealBtn").addEventListener("click", () => {
    const name = prompt("काय खाल्ले?");
    if (!name || !name.trim()) return;

    const type = prompt(
      "जेवणाचा प्रकार लिहा: Breakfast / Lunch / Dinner / Snack"
    ) || "Meal";

    data.meals.push({
      name: name.trim(),
      type: type.trim()
    });

    saveData();
  });
}

// Bottom navigation
document.querySelectorAll(".nav-item").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach(item => {
      item.classList.remove("active");
    });

    button.classList.add("active");

    const tab = button.dataset.tab;

    if (tab !== "home") {
      showMessage(tab + " विभाग अजून तयार करायचा आहे.");
    }
  });
});

// Today's date
if ($("todayLabel")) {
  $("todayLabel").textContent =
    new Date().toLocaleDateString("mr-IN", {
      weekday: "long",
      day: "numeric",
      month: "long"
    });
}

render();
