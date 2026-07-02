const app = document.getElementById("app");
const xpCountElement = document.getElementById("xp-count");
const overallLabel = document.getElementById("overall-label");
const overallBar = document.getElementById("overall-bar");
const badgeRow = document.getElementById("badge-row");
const xpPopup = document.getElementById("xp-popup");
const studentInput = document.getElementById("student-input");
const savePlayerButton = document.getElementById("save-player");

const badgeRules = [
  { id: "bronze", name: "Bronze Star", required: 80 },
  { id: "silver", name: "Silver Shield", required: 160 },
  { id: "gold", name: "Gold Crown", required: 280 },
  { id: "master", name: "Master Scholar", required: 400 }
];

const STORAGE_KEY = typeof LOCAL_STORAGE_KEY !== "undefined"
  ? LOCAL_STORAGE_KEY
  : window.LOCAL_STORAGE_KEY || "study-quest-state";
const SERVER_URL = typeof SCRIPT_URL !== "undefined"
  ? SCRIPT_URL
  : window.SCRIPT_URL || "";
const SUBJECTS = typeof subjects !== "undefined"
  ? subjects
  : window.subjects || {};
const HINTS = typeof TASK_HINTS !== "undefined"
  ? TASK_HINTS
  : window.TASK_HINTS || {};

let studentName = "";
let trackerState = loadState();

if (trackerState.student) {
  studentName = trackerState.student;
  studentInput.value = studentName;
}

savePlayerButton.addEventListener("click", () => {
  const name = studentInput.value.trim();
  if (!name) {
    studentInput.focus();
    return;
  }

  studentName = name;
  trackerState.student = studentName;
  console.log("Student name saved:", studentName);
  saveState();
  renderApp();
});

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") || {};
  } catch (error) {
    return {};
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trackerState));
}

function getEffectiveDayKey() {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setHours(3, 30, 0, 0);

  if (now < cutoff) {
    cutoff.setDate(cutoff.getDate() - 1);
  }

  return cutoff.toISOString().slice(0, 10);
}

function resetDailyTasksIfNeeded() {
  const effectiveDay = getEffectiveDayKey();
  if (trackerState.lastRefreshDate === effectiveDay) return;

  trackerState.lastRefreshDate = effectiveDay;
  trackerState.status = trackerState.status || {};

  Object.entries(SUBJECTS).forEach(([subject, info]) => {
    if (info.frequency === "daily") {
      trackerState.status[subject] = {};
    }
  });

  saveState();
}

function renderApp() {
  resetDailyTasksIfNeeded();
  app.innerHTML = "";
  const dateBanner = document.getElementById("date-banner");
  const today = new Date();

  if (dateBanner) {
    dateBanner.textContent = `Today: ${today.toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric"
    })} · Mock Tests save weekly`;
  }

  Object.entries(SUBJECTS).forEach(([subject, info]) => {
    const tasks = info.tasks || [];
    const frequency = info.frequency || "daily";
    app.appendChild(createSubjectCard(subject, tasks, frequency));
  });
  updateOverallProgress();
  updateBadges();
}

function createSubjectCard(subject, tasks, frequency) {
  const card = document.createElement("section");
  card.className = "card";

  const header = document.createElement("h2");
  header.textContent = subject;
  card.appendChild(header);

  const frequencyBadge = document.createElement("div");
  frequencyBadge.className = "subject-frequency";
  frequencyBadge.textContent = frequency === "weekly" ? "Weekly plan" : "Daily plan";
  card.appendChild(frequencyBadge);

  const subjectStatus = (trackerState.status && trackerState.status[subject]) || {};
  const progressWrapper = document.createElement("div");
  progressWrapper.className = "card-progress";
  progressWrapper.innerHTML = `
    <div class="progress-track"><div class="fill"></div></div>
    <div class="card-fade"><span class="subject-progress-label"></span></div>
  `;

  tasks.forEach((task) => {
    const row = document.createElement("label");
    row.className = "task-row";

    const meta = document.createElement("div");
    meta.className = "task-meta";

    const name = document.createElement("span");
    name.className = "task-name";
    name.textContent = task;

    const note = document.createElement("span");
    note.className = "task-note";
    note.textContent = HINTS[task] || "Complete this step";

    meta.appendChild(name);
    meta.appendChild(note);

    const button = document.createElement("button");
    button.className = "task-toggle";
    button.type = "button";
    button.innerHTML = `<span class="checkmark"></span> ${subjectStatus[task] ? "Done" : "Mark"}`;
    button.dataset.subject = subject;
    button.dataset.task = task;
    if (!studentName) {
      button.classList.add("disabled");
      button.disabled = true;
    }
    if (subjectStatus[task]) {
      button.classList.add("checked");
    }

    button.addEventListener("click", () => {
      if (!studentName) return;
      const isChecked = !button.classList.contains("checked");
      toggleTask(subject, task, button, isChecked);
    });

    row.appendChild(meta);
    row.appendChild(button);
    card.appendChild(row);
  });

  card.appendChild(progressWrapper);
  updateCardProgress(card, subject, tasks.length);

  return card;
}

function toggleTask(subject, task, button, completed) {
  trackerState.status = trackerState.status || {};
  trackerState.status[subject] = trackerState.status[subject] || {};
  trackerState.status[subject][task] = completed;

  if (completed) {
    button.classList.add("checked");
    button.innerHTML = `<span class="checkmark"></span> Done`;
    showXpPopup();
  } else {
    button.classList.remove("checked");
    button.innerHTML = `<span class="checkmark"></span> Mark`;
  }

  saveState();
  refreshProgress();
  sendTaskUpdate(subject, task, completed);
}

function refreshProgress() {
  document.querySelectorAll(".card").forEach((card) => {
    const subject = card.querySelector("h2").textContent;
    const tasks = (SUBJECTS[subject] && SUBJECTS[subject].tasks) || [];
    updateCardProgress(card, subject, tasks.length);
  });
  updateOverallProgress();
  updateBadges();
}

function updateCardProgress(card, subject, totalTasks) {
  const subjectStatus = (trackerState.status && trackerState.status[subject]) || {};
  const completedCount = Object.values(subjectStatus).filter(Boolean).length;
  const fill = card.querySelector(".fill");
  const label = card.querySelector(".subject-progress-label");
  const progress = totalTasks === 0 ? 0 : Math.round((completedCount / totalTasks) * 100);

  if (fill) fill.style.width = `${progress}%`;
  if (label) label.textContent = `${completedCount} of ${totalTasks} tasks completed`;
}

function updateOverallProgress() {
  const allTasks = Object.entries(SUBJECTS).flatMap(([subject, info]) => (info.tasks || []).map((task) => ({ subject, task })));
  const doneTasks = allTasks.filter(({ subject, task }) => trackerState.status && trackerState.status[subject] && trackerState.status[subject][task]);
  const progress = allTasks.length === 0 ? 0 : Math.round((doneTasks.length / allTasks.length) * 100);

  overallBar.style.width = `${progress}%`;
  overallLabel.textContent = `${progress}% complete`;
  xpCountElement.textContent = `${doneTasks.length * 20}`;
}

function updateBadges() {
  badgeRow.innerHTML = "";
  const xp = parseInt(xpCountElement.textContent, 10) || 0;
  const previouslyUnlocked = Array.isArray(trackerState.unlockedBadges) ? trackerState.unlockedBadges : [];
  const activeBadges = [];

  badgeRules.forEach((badge) => {
    const badgeItem = document.createElement("div");
    badgeItem.className = "badge";
    if (xp >= badge.required) {
      badgeItem.classList.add("active");
      activeBadges.push(badge.name);
    }
    badgeItem.innerHTML = `
      <span>${badge.required} XP</span>
      <strong>${badge.name}</strong>
    `;
    badgeRow.appendChild(badgeItem);
  });

  const newlyUnlocked = activeBadges.filter((name) => !previouslyUnlocked.includes(name));
  if (newlyUnlocked.length > 0) {
    showBadgeBurst(newlyUnlocked[0]);
  }

  trackerState.unlockedBadges = activeBadges;
  saveState();
}

function showXpPopup() {
  xpPopup.classList.add("show");
  setTimeout(() => xpPopup.classList.remove("show"), 1400);
}

function sendTaskUpdate(subject, task, completed) {
  if (!SERVER_URL || SERVER_URL.includes("PASTE_YOUR_WEB_APP_URL_HERE") || !SERVER_URL.startsWith("http")) {
    console.warn("Google Sheets URL not configured. Save your web app URL in config.js.");
    return;
  }

  const now = new Date();
  const payload = {
    sheetName: getSheetName(subject, now),
    date: now.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
    time: now.toLocaleTimeString(),
    student: studentName,
    subject,
    task,
    completed,
    frequency: subject === "Mock Tests" ? "weekly" : "daily"
  };
  // API key may be provided by env.js at runtime; it's included automatically via window.API_KEY if present elsewhere

  fetch(SERVER_URL, {
    method: "POST",
    body: JSON.stringify(payload)
  })
    .then((response) => response.text())
    .then((text) => {
      console.log("Sheet saved:", text);
    })
    .catch((error) => {
      console.error("Sheet save failed:", error);
    });
}

function getSheetName(subject, date) {
  if (subject === "Mock Tests") {
    return "Mock Tests";
  }
  return date.toISOString().slice(0, 10);
}

function showBadgeBurst(badgeName) {
  const burst = document.getElementById("badge-burst");
  if (!burst) return;

  burst.textContent = `Badge unlocked: ${badgeName}!`;
  burst.classList.remove("replay");
  void burst.offsetWidth;
  burst.classList.add("show", "replay");
  setTimeout(() => burst.classList.remove("show"), 1700);
}

function init() {
  renderApp();
}

init();