"use strict";

/* =====================================
   LIFE OS - PERSONAL LIFE MANAGER
   ===================================== */

const KEY = "lifeos_v1";

const $ = id => document.getElementById(id);

const today = () => {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0")
  ].join("-");
};

const fresh = () => ({
  tasks: [],
  checks: {},
  study: [],
  fitness: [],
  water: {},
  waterTarget: 8,
  meals: [],
  sleep: [],
  goals: []
});

let db = load();
let selectedCalendarDay = today();
let toastTimer;

/* =====================================
   DATA STORAGE
   ===================================== */

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "{}");
    return { ...fresh(), ...saved };
  } catch (error) {
    return fresh();
  }
}

function save() {
  localStorage.setItem(KEY, JSON.stringify(db));
}

function safeNumber(value, min = 0, max = 100000) {
  const n = Number(value);
  return Number.isFinite(n)
    ? Math.max(min, Math.min(max, n))
    : min;
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.style.display = "block";

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    el.style.display = "none";
  }, 2200);
}

/* =====================================
   NAVIGATION
   ===================================== */

const navItems = [
  ["dashboard", "⌂", "Home"],
  ["analytics", "◒", "Progress"],
  ["calendar", "▦", "Calendar"],
  ["profile", "○", "Profile"]
];

function buildNav() {
  const nav = $("mobileNav");

  nav.innerHTML = navItems.map(([id, icon, label]) => `
    <button
      class="${id === "dashboard" ? "active" : ""}"
      onclick="showView('${id}')">
      <span>${icon}</span>
      ${label}
    </button>
  `).join("");
}

function showView(id) {
  const target = $(id);

  if (!target || !target.classList.contains("view")) return;

  document.querySelectorAll(".view").forEach(view => {
    view.classList.toggle("active", view.id === id);
  });

  document.querySelectorAll("#mobileNav button").forEach(button => {
    const active = button.getAttribute("onclick") ===
      `showView('${id}')`;

    button.classList.toggle("active", active);
  });

  render();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

/* =====================================
   DATE AND GREETING
   ===================================== */

function updateGreeting() {
  const hour = new Date().getHours();

  const greeting =
    hour < 12 ? "Good morning" :
    hour < 17 ? "Good afternoon" :
    hour < 21 ? "Good evening" :
    "Good night";

  $("greeting").textContent =
    greeting + ", Avishkar";
}

function updateDate() {
  $("todayLabel").textContent =
    new Date().toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric"
    });
}

/* =====================================
   ROUTINE / TASKS
   ===================================== */

function dayChecks(date = today()) {
  return db.checks[date] || [];
}

function activeTasks(date = today()) {
  const day = new Date(date + "T12:00:00").getDay();

  return db.tasks.filter(task =>
    task.repeat === "daily" ||
    (task.repeat === "weekdays" && day > 0 && day < 6) ||
    (task.repeat === "weekends" && (day === 0 || day === 6))
  );
}

function addTask() {
  const name = $("taskName").value.trim();

  if (!name) {
    toast("Enter a task name");
    return;
  }

  db.tasks.push({
    id: Date.now(),
    name,
    time: $("taskTime").value,
    cat: $("taskCat").value,
    repeat: $("taskRepeat").value
  });

  $("taskName").value = "";
  $("taskTime").value = "";

  save();
  render();
  toast("Routine task added");
}

function toggleTask(id, checked) {
  const date = today();

  const checks = dayChecks(date).filter(x => x !== id);

  if (checked) checks.push(id);

  db.checks[date] = checks;

  save();
  render();
}

function deleteTask(id) {
  if (!confirm("Delete this routine task?")) return;

  db.tasks = db.tasks.filter(task => task.id !== id);

  Object.keys(db.checks).forEach(date => {
    db.checks[date] =
      db.checks[date].filter(taskId => taskId !== id);
  });

  save();
  render();
}

function taskMarkup(task, date = today()) {
  const done = dayChecks(date).includes(task.id);

  return `
    <div class="task ${done ? "done" : ""}">
      <input
        type="checkbox"
        ${done ? "checked" : ""}
        onchange="toggleTask(${task.id},this.checked)">

      <div class="task-main">
        <div class="task-title">${esc(task.name)}</div>
        <small>
          ${esc(task.time || "Any time")} · ${esc(task.cat)}
        </small>
      </div>

      <button class="btn danger tiny"
        onclick="deleteTask(${task.id})">
        Delete
      </button>
    </div>
  `;
}

/* =====================================
   STUDY TRACKER
   ===================================== */

function addStudy() {
  const subject = $("studySubject").value.trim();
  const minutes = safeNumber($("studyMinutes").value, 1);

  if (!subject || !$("studyMinutes").value ||
      minutes < 1 || minutes > 1440) {
    toast("Enter subject and valid duration");
    return;
  }

  db.study.unshift({
    id: Date.now(),
    date: today(),
    subject,
    minutes,
    note: $("studyNote").value.trim()
  });

  $("studySubject").value = "";
  $("studyMinutes").value = "";
  $("studyNote").value = "";

  save();
  render();
  toast("Study session saved");
}

function studyTotal(date = today()) {
  return db.study
    .filter(item => item.date === date)
    .reduce((sum, item) => sum + safeNumber(item.minutes), 0);
}

/* =====================================
   FITNESS TRACKER
   ===================================== */

function addFitness() {
  const name = $("fitName").value.trim();
  const minutes = safeNumber($("fitMinutes").value, 1);

  if (!name || !$("fitMinutes").value ||
      minutes < 1 || minutes > 1440) {
    toast("Enter activity and valid duration");
    return;
  }

  db.fitness.unshift({
    id: Date.now(),
    date: today(),
    name,
    minutes,
    note: $("fitNote").value.trim()
  });

  $("fitName").value = "";
  $("fitMinutes").value = "";
  $("fitNote").value = "";

  save();
  render();
  toast("Workout saved");
}

function fitnessTotal(date = today()) {
  return db.fitness
    .filter(item => item.date === date)
    .reduce((sum, item) => sum + safeNumber(item.minutes), 0);
}

/* =====================================
   WATER TRACKER
   ===================================== */

function waterToday() {
  return safeNumber(db.water[today()]);
}

function setWater(amount) {
  db.water[today()] = Math.min(
    db.waterTarget,
    Math.max(0, amount)
  );

  save();
  render();
}

function changeWaterTarget() {
  db.waterTarget = safeNumber(
    $("waterTarget").value,
    1,
    30
  );

  if (!db.waterTarget) db.waterTarget = 8;

  db.water[today()] = Math.min(
    waterToday(),
    db.waterTarget
  );

  save();
  render();
}

function waterButtons() {
  return Array.from(
    { length: db.waterTarget },
    (_, index) => `
      <button
        class="glass ${index < waterToday() ? "filled" : ""}"
        onclick="setWater(${index + 1})"
        aria-label="Set water to ${index + 1} glasses">
        ${index < waterToday() ? "✓" : "○"}
      </button>
    `
  ).join("");
}

/* =====================================
   FOOD TRACKER
   ===================================== */

function addMeal() {
  const name = $("mealName").value.trim();

  if (!name) {
    toast("Enter your meal");
    return;
  }

  db.meals.unshift({
    id: Date.now(),
    date: today(),
    type: $("mealType").value,
    name
  });

  $("mealName").value = "";

  save();
  render();
  toast("Meal added");
}

/* =====================================
   SLEEP TRACKER
   ===================================== */

function addSleep() {
  const bed = $("bedTime").value;
  const wake = $("wakeTime").value;

  if (!bed || !wake) {
    toast("Enter bedtime and wake-up time");
    return;
  }

  const [bh, bm] = bed.split(":").map(Number);
  const [wh, wm] = wake.split(":").map(Number);

  let minutes = (wh * 60 + wm) - (bh * 60 + bm);

  if (minutes <= 0) minutes += 1440;

  db.sleep.unshift({
    id: Date.now(),
    date: today(),
    bed,
    wake,
    hours: minutes / 60
  });

  $("bedTime").value = "";
  $("wakeTime").value = "";

  save();
  render();
  toast("Sleep log saved");
}

function saveSleep() {
  const hours = Number($("dashSleep").value);

  if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
    toast("Enter valid sleep hours");
    return;
  }

  const existing = db.sleep.find(
    item => item.date === today()
  );

  if (existing) {
    existing.hours = hours;
  } else {
    db.sleep.unshift({
      id: Date.now(),
      date: today(),
      hours
    });
  }

  save();
  render();
  toast("Sleep hours saved");
}

/* =====================================
   GOALS
   ===================================== */

function addGoal() {
  const name = $("goalName").value.trim();

  if (!name) {
    toast("Enter a goal");
    return;
  }

  db.goals.unshift({
    id: Date.now(),
    name,
    due: $("goalDate").value,
    done: false
  });

  $("goalName").value = "";
  $("goalDate").value = "";

  save();
  render();
  toast("Goal created");
}

function goalToggle(id) {
  const goal = db.goals.find(item => item.id === id);

  if (!goal) return;

  goal.done = !goal.done;

  save();
  render();
}

function goalDelete(id) {
  if (!confirm("Delete this goal?")) return;

  db.goals = db.goals.filter(goal => goal.id !== id);

  save();
  render();
}

/* =====================================
   CALENDAR
   ===================================== */

function renderCalendar() {
  const el = $("calendarGrid");
  el.innerHTML = "";

  for (let i = 13; i >= 0; i--) {
    const date = new Date();

    date.setDate(date.getDate() - i);

    const key = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");

    const button = document.createElement("button");

    button.className =
      "day" +
      (key === today() ? " today" : "") +
      (key === selectedCalendarDay ? " selected" : "");

    button.innerHTML = `
      ${date.toLocaleDateString("en", { weekday: "short" })}
      <strong>${date.getDate()}</strong>
    `;

    button.onclick = () => {
      selectedCalendarDay = key;
      renderCalendar();
      renderCalendarDetail(key);
    };

    el.appendChild(button);
  }

  renderCalendarDetail(selectedCalendarDay);
}

function renderCalendarDetail(date) {
  const completed = db.checks[date] || [];

  const names = db.tasks
    .filter(task => completed.includes(task.id))
    .map(task => task.name);

  const study = studyTotal(date);
  const fitness = fitnessTotal(date);
  const water = safeNumber(db.water[date]);

  $("calendarDetail").innerHTML = `
    <p><b>${esc(date)}</b></p>
    <p>Tasks completed: ${names.length}</p>
    <p>Study: ${study} minutes</p>
    <p>Workout: ${fitness} minutes</p>
    <p>Water: ${water} glasses</p>
    <p>Completed tasks: ${
      names.length ? names.map(esc).join(", ") : "None"
    }</p>
  `;
}

/* =====================================
   PROGRESS
   ===================================== */

function renderProgress() {
  const tasks = activeTasks();
  const done = tasks.filter(
    task => dayChecks().includes(task.id)
  ).length;

  $("aDone").textContent = done;
  $("aStudy").textContent = studyTotal();
  $("aFitness").textContent = fitnessTotal();
  $("aGoals").textContent =
    db.goals.filter(goal => !goal.done).length;

  $("weeklyBars").innerHTML = Array.from(
    { length: 7 },
    (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - 6 + index);

      const key = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0")
      ].join("-");

      const total = activeTasks(key).length;
      const completed = dayChecks(key).length;

      const percent = total
        ? Math.min(100, Math.round(completed / total * 100))
        : 0;

      const label = date.toLocaleDateString("en", {
        weekday: "short"
      });

      return `
        <div class="bar-row">
          <span class="bar-label">${label}</span>
          <div class="bar-track">
            <div class="bar-fill" style="width:${percent}%"></div>
          </div>
          <span class="bar-value">${percent}%</span>
        </div>
      `;
    }
  ).join("");

  const start = new Date();
  start.setDate(start.getDate() - 6);

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);

    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");
  });

  const studyWeek = weekDates.reduce(
    (sum, date) => sum + studyTotal(date), 0
  );

  const fitnessWeek = weekDates.reduce(
    (sum, date) => sum + fitnessTotal(date), 0
  );

  $("weeklyActivity").innerHTML = `
    <div class="list-item">
      <span>Study this week</span>
      <b>${studyWeek} min</b>
    </div>
    <div class="list-item">
      <span>Workout this week</span>
      <b>${fitnessWeek} min</b>
    </div>
  `;
}

/* =====================================
   MAIN RENDER
   ===================================== */

function render() {
  const tasks = activeTasks();

  const done = tasks.filter(
    task => dayChecks().includes(task.id)
  ).length;

  const percent = tasks.length
    ? Math.round(done / tasks.length * 100)
    : 0;

  $("heroPercent").textContent =
    percent + "% complete";

  $("heroSub").textContent = tasks.length
    ? `${done} of ${tasks.length} tasks completed.`
    : "Add your first routine task to get started.";

  $("heroBar").style.width = percent + "%";

  $("mTasks").textContent = `${done}/${tasks.length}`;
  $("mStudy").textContent = studyTotal() + " min";
  $("mWater").textContent =
    `${waterToday()}/${db.waterTarget}`;

  $("mGoals").textContent =
    db.goals.filter(goal => !goal.done).length;

  $("dashTasks").innerHTML = tasks.length
    ? tasks.slice(0, 5).map(task => taskMarkup(task)).join("")
    : `<div class="empty">No routine tasks yet. Add your first one.</div>`;

  $("routineList").innerHTML = tasks.length
    ? tasks.map(task => taskMarkup(task)).join("")
    : `<div class="empty">Your routine is clear. Add a task above.</div>`;

  $("taskCount").textContent = tasks.length + " tasks";

  $("dashWater").innerHTML = waterButtons();
  $("waterGrid").innerHTML = waterButtons();

  $("waterCount").textContent =
    `${waterToday()}/${db.waterTarget}`;

  $("waterTarget").value = db.waterTarget;

  const lastSleep = db.sleep.find(
    item => item.date === today()
  );

  $("dashSleep").value = lastSleep?.hours || "";

  /* Study */

  $("studyToday").textContent = studyTotal() + " min";

  $("studySessions").textContent =
    db.study.filter(item => item.date === today()).length;

  $("studyList").innerHTML = db.study.length
    ? db.study.slice(0, 30).map(item => `
        <div class="list-item">
          <div>
            <b>${esc(item.subject)}</b>
            <div class="muted small">
              ${esc(item.date)} · ${esc(item.note || "Study session")}
            </div>
          </div>
          <span class="pill">${safeNumber(item.minutes)} min</span>
        </div>
      `).join("")
    : `<div class="empty">No study sessions logged.</div>`;

  /* Fitness */

  $("fitnessList").innerHTML = db.fitness.length
    ? db.fitness.slice(0, 30).map(item => `
        <div class="list-item">
          <div>
            <b>${esc(item.name)}</b>
            <div class="muted small">
              ${esc(item.date)} · ${esc(item.note || "Workout")}
            </div>
          </div>
          <span class="pill">${safeNumber(item.minutes)} min</span>
        </div>
      `).join("")
    : `<div class="empty">No workouts logged.</div>`;

  /* Meals */

  const meals = db.meals.filter(
    item => item.date === today()
  );

  $("mealList").innerHTML = meals.length
    ? meals.map(item => `
        <div class="list-item">
          <div>
            <b>${esc(item.type)}</b>
            <div class="muted small">${esc(item.name)}</div>
          </div>
          <span class="pill">Today</span>
        </div>
      `).join("")
    : `<div class="empty">No meals logged today.</div>`;

  /* Sleep */

  $("sleepList").innerHTML = db.sleep.length
    ? db.sleep.slice(0, 20).map(item => `
        <div class="list-item">
          <div>
            <b>${esc(item.date)}</b>
            <div class="muted small">
              ${item.bed ? esc(item.bed) + " → " + esc(item.wake) : "Sleep duration"}
            </div>
          </div>
          <span class="pill">
            ${safeNumber(item.hours).toFixed(1)} hrs
          </span>
        </div>
      `).join("")
    : `<div class="empty">No sleep logs yet.</div>`;

  /* Goals */

  $("goalList").innerHTML = db.goals.length
    ? db.goals.map(goal => `
        <div class="list-item">
          <div class="row">
            <input
              type="checkbox"
              ${goal.done ? "checked" : ""}
              onchange="goalToggle(${goal.id})">

            <div>
              <b style="${goal.done ? "text-decoration:line-through;color:#9aa3b2" : ""}">
                ${esc(goal.name)}
              </b>
              <div class="muted small">
                ${goal.due ? "Due " + esc(goal.due) : "No deadline"}
              </div>
            </div>
          </div>

          <button class="btn danger tiny"
            onclick="goalDelete(${goal.id})">
            Delete
          </button>
        </div>
      `).join("")
    : `<div class="empty">No goals yet. Create your first goal.</div>`;

  renderCalendar();
  renderProgress();
}

/* =====================================
   BACKUP AND RESTORE
   ===================================== */

function exportData() {
  const blob = new Blob(
    [JSON.stringify(db, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "lifeos-backup-" + today() + ".json";

  link.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);

  toast("Backup exported");
}

function importData(event) {
  const file = event.target.files[0];

  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);

      if (!imported || typeof imported !== "object" ||
          Array.isArray(imported)) {
        throw new Error("Invalid backup");
      }

      const next = { ...fresh(), ...imported };

      if (!Array.isArray(next.tasks) ||
          !Array.isArray(next.study) ||
          !Array.isArray(next.fitness) ||
          !Array.isArray(next.meals) ||
          !Array.isArray(next.sleep) ||
          !Array.isArray(next.goals) ||
          !next.checks || typeof next.checks !== "object" ||
          !next.water || typeof next.water !== "object") {
        throw new Error("Invalid backup structure");
      }

      db = next;
      db.waterTarget = safeNumber(db.waterTarget, 1, 30) || 8;

      save();
      render();

      toast("Backup imported successfully");

    } catch (error) {
      toast("Invalid backup file");
    }

    event.target.value = "";
  };

  reader.readAsText(file);
}

function resetData() {
  if (!confirm(
    "This will permanently erase all LIFE OS data in this browser. Continue?"
  )) return;

  db = fresh();

  save();
  render();

  toast("App data reset");
}

/* =====================================
   START APPLICATION
   ===================================== */

buildNav();
updateDate();
updateGreeting();
render();
