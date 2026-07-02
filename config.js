// Optional: script URL and API key can be provided via `/.env` + `env.js` at runtime.
// If `env.js` sets window.SCRIPT_URL or window.API_KEY they will override the defaults below.
const SCRIPT_URL = (typeof window !== 'undefined' && window.SCRIPT_URL)
  ? window.SCRIPT_URL
  : "https://script.google.com/macros/s/AKfycbzS7pyRTfiw_Fohnr5-Lb85q5ZleOP-nytz8XF1Ll6ydyqSV-5M2RAszhTvl9PJN9gA/exec";

const API_KEY = (typeof window !== 'undefined' && window.API_KEY) ? window.API_KEY : '';

const subjects = {
  English: { tasks: ["Video", "Questions", "Revision", "Mock"], frequency: "daily" },
  Reasoning: { tasks: ["Video", "Questions", "Revision", "Mock"], frequency: "daily" },
  Math: { tasks: ["Video", "Questions", "Revision", "Mock"], frequency: "daily" },
  GK: { tasks: ["Video", "Questions", "Revision"], frequency: "daily" },
  "Mock Tests": { tasks: ["Day 1", "Day 2"], frequency: "weekly" }
};

const TASK_HINTS = {
  Video: "Watch lesson",
  Questions: "Solve practice",
  Revision: "Review notes",
  Mock: "Complete mock practice",
  "Day 1": "Mock test day one",
  "Day 2": "Mock test day two"
};

const LOCAL_STORAGE_KEY = "study-quest-state";
