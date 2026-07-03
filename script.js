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

function getAllSubjectTasks(subject) {
  const subjectConfig = SUBJECTS[subject];
  if (!subjectConfig) return [];
  if (subjectConfig.categories) {
    return Object.keys(subjectConfig.categories).flatMap((category) => getCategoryTasks(subject, category));
  }
  return getSubjectTasks(subject);
}

function getSubjectTasks(subject) {
  const subjectConfig = SUBJECTS[subject];
  if (!subjectConfig) return [];
  if (subjectConfig.categories) {
    const category = getSelectedCategory(subject);
    return getCategoryTasks(subject, category);
  }
  const baseTasks = subjectConfig.tasks ? [...subjectConfig.tasks] : [];
  trackerState.customTasks = trackerState.customTasks || {};
  const custom = trackerState.customTasks[subject] || [];
  custom.forEach((task) => {
    if (task && !baseTasks.includes(task)) {
      baseTasks.push(task);
    }
  });
  return baseTasks;
}

function getCategoryTasks(subject, category) {
  const subjectConfig = SUBJECTS[subject];
  if (!subjectConfig || !subjectConfig.categories || !category) return [];
  const baseTasks = [...(subjectConfig.categories[category] || [])];
  trackerState.customTasks = trackerState.customTasks || {};
  trackerState.customTasks[subject] = trackerState.customTasks[subject] || {};
  const custom = trackerState.customTasks[subject][category] || [];
  custom.forEach((task) => {
    if (task && !baseTasks.includes(task)) {
      baseTasks.push(task);
    }
  });
  return baseTasks;
}

function getCategoryList(subject) {
  const subjectConfig = SUBJECTS[subject];
  return subjectConfig && subjectConfig.categories ? Object.keys(subjectConfig.categories) : [];
}

function getSelectedCategory(subject) {
  trackerState.selectedCategory = trackerState.selectedCategory || {};
  const categories = getCategoryList(subject);
  let selected = trackerState.selectedCategory[subject];
  if (!selected || categories.indexOf(selected) === -1) {
    selected = categories[0] || null;
    trackerState.selectedCategory[subject] = selected;
    saveState();
  }
  return selected;
}

function setSelectedCategory(subject, category) {
  trackerState.selectedCategory = trackerState.selectedCategory || {};
  trackerState.selectedCategory[subject] = category;
  saveState();
}

function buildTaskKey(category, task) {
  return `${category}: ${task}`;
}

function getTaskLabel(taskKey) {
  return taskKey;
}

function isCategoryComplete(subject, category) {
  const categoryTasks = getCategoryTasks(subject, category);
  if (categoryTasks.length === 0) return false;
  const subjectStatus = (trackerState.status && trackerState.status[subject]) || {};
  return categoryTasks.every((task) => subjectStatus[buildTaskKey(category, task)]);
}

function getIncompleteTasks(subject) {
  if (SUBJECTS[subject] && SUBJECTS[subject].categories) {
    const category = getSelectedCategory(subject);
    return getCategoryTasks(subject, category).filter((task) => {
      const key = buildTaskKey(category, task);
      return !(trackerState.status && trackerState.status[subject] && trackerState.status[subject][key]);
    });
  }
  const subjectStatus = (trackerState.status && trackerState.status[subject]) || {};
  return getSubjectTasks(subject).filter((task) => !subjectStatus[task]);
}

function addCustomSubcategory(subject, category, newTask) {
  if (!newTask || !subject || !category || !SUBJECTS[subject] || !SUBJECTS[subject].editable) return;
  trackerState.customTasks = trackerState.customTasks || {};
  trackerState.customTasks[subject] = trackerState.customTasks[subject] || {};
  trackerState.customTasks[subject][category] = trackerState.customTasks[subject][category] || [];
  if (!trackerState.customTasks[subject][category].includes(newTask) && !getCategoryTasks(subject, category).includes(newTask)) {
    trackerState.customTasks[subject][category].push(newTask);
    saveState();
  }
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
    const tasks = getSubjectTasks(subject);
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

  if (SUBJECTS[subject] && SUBJECTS[subject].dropdown) {
    const category = getSelectedCategory(subject);
    const categories = getCategoryList(subject);

    const selectionRow = document.createElement("div");
    selectionRow.className = "task-row dropdown-row";

    const categorySelect = document.createElement("select");
    categorySelect.className = "task-select";
    categorySelect.disabled = !studentName;

    categorySelect.addEventListener("change", () => {
      setSelectedCategory(subject, categorySelect.value);
      renderApp();
    });

    categories.forEach((cat) => {
      const option = document.createElement("option");
      option.value = cat;
      option.textContent = cat;
      if (cat === category) option.selected = true;
      categorySelect.appendChild(option);
    });

    const taskSelect = document.createElement("select");
    taskSelect.className = "task-select";
    taskSelect.disabled = !studentName;
    taskSelect.style.minWidth = "240px";

    const taskPlaceholder = document.createElement("option");
    taskPlaceholder.value = "";
    taskPlaceholder.textContent = "Select a task";
    taskSelect.appendChild(taskPlaceholder);

    const incompleteTasks = getIncompleteTasks(subject);
    if (incompleteTasks.length === 0) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "All tasks completed";
      taskSelect.appendChild(option);
      taskSelect.disabled = true;
    } else {
      incompleteTasks.forEach((task) => {
        const option = document.createElement("option");
        option.value = task;
        option.textContent = task;
        taskSelect.appendChild(option);
      });
    }

    const completeButton = document.createElement("button");
    completeButton.className = "task-toggle";
    completeButton.type = "button";
    completeButton.textContent = "Complete";
    completeButton.disabled = !studentName || incompleteTasks.length === 0;
    if (!studentName) {
      completeButton.classList.add("disabled");
    }

    completeButton.addEventListener("click", () => {
      const selectedTask = taskSelect.value;
      if (!selectedTask) return;
      const taskKey = buildTaskKey(category, selectedTask);
      toggleTask(subject, taskKey, null, true);
      renderApp();
    });

    selectionRow.appendChild(categorySelect);
    selectionRow.appendChild(taskSelect);
    selectionRow.appendChild(completeButton);
    card.appendChild(selectionRow);

    const taskList = document.createElement("div");
    taskList.className = "english-task-list";
    getCategoryTasks(subject, category).forEach((task) => {
      const taskKey = buildTaskKey(category, task);
      const isDone = !!(subjectStatus[taskKey]);
      const taskItem = document.createElement("div");
      taskItem.className = "english-task-item";

      const taskName = document.createElement("span");
      taskName.className = "task-name";
      taskName.textContent = task;

      const statusPill = document.createElement("span");
      statusPill.className = `status-pill ${isDone ? "done" : "pending"}`;
      statusPill.textContent = isDone ? "Done" : "Pending";

      taskItem.appendChild(taskName);
      taskItem.appendChild(statusPill);
      taskList.appendChild(taskItem);
    });
    card.appendChild(taskList);

    const completedBlock = document.createElement("div");
    completedBlock.className = "completed-block";
    const completedTasks = getCategoryTasks(subject, category).filter((task) => subjectStatus[buildTaskKey(category, task)]);
    if (completedTasks.length) {
      completedBlock.innerHTML = `<strong>Completed:</strong> ${completedTasks.join(", ")}`;
    } else {
      completedBlock.innerHTML = `<strong>Completed:</strong> none yet`;
    }
    card.appendChild(completedBlock);

    if (SUBJECTS[subject].editable) {
      const editRow = document.createElement("div");
      editRow.className = "task-row edit-row";

      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = `Add new task for ${category}`;
      input.className = "task-input";

      const addButton = document.createElement("button");
      addButton.className = "task-toggle";
      addButton.type = "button";
      addButton.textContent = "Add";
      addButton.addEventListener("click", () => {
        const newTask = input.value.trim();
        if (!newTask) return;
        addCustomSubcategory(subject, category, newTask);
        input.value = "";
        renderApp();
      });

      editRow.appendChild(input);
      editRow.appendChild(addButton);
      card.appendChild(editRow);
    }
  } else {
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
  }

  card.appendChild(progressWrapper);
  updateCardProgress(card, subject, tasks.length);

  return card;
}

function toggleTask(subject, task, button, completed) {
  trackerState.status = trackerState.status || {};
  trackerState.status[subject] = trackerState.status[subject] || {};
  trackerState.status[subject][task] = completed;

  if (button) {
    if (completed) {
      button.classList.add("checked");
      button.innerHTML = `<span class="checkmark"></span> Done`;
      showXpPopup();
    } else {
      button.classList.remove("checked");
      button.innerHTML = `<span class="checkmark"></span> Mark`;
    }
  } else if (completed) {
    showXpPopup();
  }

  saveState();
  refreshProgress();
  sendTaskUpdate(subject, task, completed);
}

function refreshProgress() {
  document.querySelectorAll(".card").forEach((card) => {
    const subject = card.querySelector("h2").textContent;
    const tasks = getSubjectTasks(subject);
    updateCardProgress(card, subject, tasks.length);
  });
  updateOverallProgress();
  updateBadges();
}

function updateCardProgress(card, subject, totalTasks) {
  const subjectStatus = (trackerState.status && trackerState.status[subject]) || {};
  let completedCount = 0;
  if (SUBJECTS[subject] && SUBJECTS[subject].categories) {
    const category = getSelectedCategory(subject);
    completedCount = getCategoryTasks(subject, category).filter((task) => subjectStatus[buildTaskKey(category, task)]).length;
  } else {
    completedCount = Object.values(subjectStatus).filter(Boolean).length;
  }

  const fill = card.querySelector(".fill");
  const label = card.querySelector(".subject-progress-label");
  const progress = totalTasks === 0 ? 0 : Math.round((completedCount / totalTasks) * 100);

  if (fill) fill.style.width = `${progress}%`;
  if (label) label.textContent = `${completedCount} of ${totalTasks} tasks completed`;
}

function updateOverallProgress() {
  const allTasks = Object.entries(SUBJECTS).flatMap(([subject]) => getAllSubjectTasks(subject).map((task) => ({ subject, task })));
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