// Page elements. The script tag is at the bottom of the HTML,
// so these elements already exist when this file runs.

const timeDisplay = document.getElementById("time-display");
const modeLabel = document.getElementById("mode-label");
const startButton = document.getElementById("start-button");
const resetButton = document.getElementById("reset-button");
const sessionCountText = document.getElementById("session-count");
const messageBox = document.getElementById("message");
const progressRing = document.getElementById("progress-ring");
const taskInput = document.getElementById("task-input");
const addButton = document.getElementById("add-button");
const taskList = document.getElementById("task-list");
const taskCountText = document.getElementById("task-count");
const taskError = document.getElementById("task-error");
const themeButton = document.getElementById("theme-button");

// ==============================
// TIMER
// ==============================

// How long each mode lasts, in minutes.
const MODES = {
  focus: { label: "Focus", minutes: 25 },
  short: { label: "Short Break", minutes: 5 },
  long: { label: "Long Break", minutes: 15 }
};

// The ring circle has radius 96. Circumference = 2 * pi * r.
const RING_RADIUS = 96;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

let mode = "focus";
let totalTime = MODES.focus.minutes * 60;
let timeLeft = totalTime;
let endTime = 0;
let timerId = null;
let isRunning = false;
let sessionCount = 0;
let beepContext = null;

// Turns a number of seconds into text like "24:05".
function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  let minuteText = String(minutes);
  let secondText = String(seconds);

  if (minutes < 10) {
    minuteText = "0" + minuteText;
  }
  if (seconds < 10) {
    secondText = "0" + secondText;
  }

  return minuteText + ":" + secondText;
}

// Updates the big clock, the tab title, and the progress ring.
function updateDisplay() {
  const timeText = formatTime(timeLeft);
  timeDisplay.textContent = timeText;
  modeLabel.textContent = MODES[mode].label;
  document.title = timeText + " - " + MODES[mode].label;
  updateRing();
}

// Shrinks the ring as time runs out.
// A full ring uses dash offset 0. An empty ring uses the full circumference.
function updateRing() {
  const fractionLeft = timeLeft / totalTime;
  const offset = RING_LENGTH * (1 - fractionLeft);
  progressRing.style.strokeDasharray = RING_LENGTH;
  progressRing.style.strokeDashoffset = offset;
}

// Changes the Start button text to match the timer state.
function updateStartButton() {
  if (isRunning) {
    startButton.textContent = "Pause";
  } else {
    startButton.textContent = "Start";
  }
}

// Highlights the button for the current mode.
function updateModeButtons() {
  const buttons = document.querySelectorAll(".mode-button");

  for (let i = 0; i < buttons.length; i++) {
    if (buttons[i].getAttribute("data-mode") === mode) {
      buttons[i].classList.add("active");
    } else {
      buttons[i].classList.remove("active");
    }
  }
}

// Writes the "sessions today" line.
function updateSessionText() {
  let word = "sessions";
  if (sessionCount === 1) {
    word = "session";
  }
  sessionCountText.textContent = sessionCount + " focus " + word + " today";
}

// Shows the banner that appears when a round finishes.
function showMessage(text) {
  messageBox.textContent = text;
  messageBox.classList.add("show");
}

// Hides the finished-round banner.
function hideMessage() {
  messageBox.textContent = "";
  messageBox.classList.remove("show");
}

// Plays two short tones with the browser's audio tools. No sound file is needed.
function playBeep() {
  if (!beepContext) {
    beepContext = new AudioContext();
  }

  playTone(880, beepContext.currentTime, 0.15);
  playTone(1175, beepContext.currentTime + 0.18, 0.22);
}

// Plays one tone. playBeep() calls this twice.
function playTone(frequency, startTime, length) {
  const oscillator = beepContext.createOscillator();
  const gain = beepContext.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gain.gain.value = 0.06;
  oscillator.connect(gain);
  gain.connect(beepContext.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + length);
}

// Creates the beep audio during a click, so the browser allows sound later.
function prepareBeep() {
  if (!beepContext) {
    beepContext = new AudioContext();
  }
  if (beepContext.state === "suspended") {
    beepContext.resume();
  }
}

// Starts counting down, once per second.
function startTimer() {
  if (isRunning) {
    return;
  }

  prepareBeep();
  isRunning = true;
  endTime = Date.now() + timeLeft * 1000;
  timerId = setInterval(tick, 1000);
  updateStartButton();
  hideMessage();
}

// Stops the countdown but keeps the time that is left.
function pauseTimer() {
  isRunning = false;
  clearInterval(timerId);
  timerId = null;
  updateStartButton();
}

// Starts the timer, or pauses it if it is already running.
function toggleTimer() {
  if (isRunning) {
    pauseTimer();
  } else {
    startTimer();
  }
}

// Puts the current mode back to its full length.
function resetTimer() {
  pauseTimer();
  timeLeft = totalTime;
  hideMessage();
  updateDisplay();
}

// Switches mode, stops the clock, and loads that mode's full time.
function setMode(newMode) {
  pauseTimer();
  mode = newMode;
  totalTime = MODES[mode].minutes * 60;
  timeLeft = totalTime;
  document.body.setAttribute("data-mode", mode);
  updateModeButtons();
  hideMessage();
  updateDisplay();
}

// After Focus, take a long break every 4th session. Otherwise take a short break.
// After either break, go back to Focus.
function getNextMode() {
  if (mode === "focus") {
    if (sessionCount > 0 && sessionCount % 4 === 0) {
      return "long";
    }
    return "short";
  }
  return "focus";
}

// Called when the clock reaches zero.
function finishTimer() {
  pauseTimer();
  playBeep();

  if (mode === "focus") {
    sessionCount = sessionCount + 1;
    saveSessions();
    updateSessionText();
  }

  const finishedLabel = MODES[mode].label;
  const nextMode = getNextMode();
  setMode(nextMode);
  showMessage(finishedLabel + " finished. Switched to " + MODES[nextMode].label + ".");
}

// Runs every second while the timer is going.
function tick() {
  timeLeft = Math.round((endTime - Date.now())/1000);

  if (timeLeft <= 0) {
    timeLeft = 0;
    updateDisplay();
    finishTimer();
    return;
  }

  updateDisplay();
}

// ==============================
// TASKS
// ==============================

let tasks = [];
let justAddedId = null;

// Adds a task from the input box. Empty text is ignored.
function addTask() {
  const text = taskInput.value.trim();

  if (text === "") {
    taskError.textContent = "Please type a task first.";
    taskInput.focus();
    return;
  }

  const task = {
    id: Date.now(),
    text: text,
    done: false
  };

  tasks.push(task);
  justAddedId = task.id;
  taskInput.value = "";
  taskError.textContent = "";
  saveTasks();
  renderTasks();
  taskInput.focus();
}

// Marks one task done or not done.
function toggleTask(id) {
  for (let i = 0; i < tasks.length; i++) {
    if (tasks[i].id === id) {
      tasks[i].done = !tasks[i].done;
    }
  }

  saveTasks();
  renderTasks();
}

// Fades a task out, then removes it from the list.
function deleteTask(id, listItem) {
  if (listItem.getAttribute("data-removing") === "true") {
    return;
  }

  listItem.setAttribute("data-removing", "true");
  listItem.classList.add("removing");

  // Wait for the fade-out animation, then delete the task.
  setTimeout(function () {
    const updated = [];

    for (let i = 0; i < tasks.length; i++) {
      if (tasks[i].id !== id) {
        updated.push(tasks[i]);
      }
    }

    tasks = updated;
    saveTasks();
    renderTasks();
  }, 280);
}

// Builds one list row: checkbox, text, and delete button.
function createTaskElement(task) {
  const item = document.createElement("li");
  item.className = "task-item";

  if (task.id === justAddedId) {
    item.classList.add("task-enter");
  }

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = task.done;
  checkbox.addEventListener("change", function () {
    toggleTask(task.id);
  });

  const text = document.createElement("span");
  text.className = "task-text";
  text.textContent = task.text;
  if (task.done) {
    text.classList.add("done");
  }

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "delete-button";
  removeButton.textContent = "Delete";
  removeButton.addEventListener("click", function () {
    deleteTask(task.id, item);
  });

  item.appendChild(checkbox);
  item.appendChild(text);
  item.appendChild(removeButton);
  return item;
}

// Draws the whole to-do list again from the tasks array.
function renderTasks() {
  taskList.innerHTML = "";

  for (let i = 0; i < tasks.length; i++) {
    const item = createTaskElement(tasks[i]);
    taskList.appendChild(item);
  }

  justAddedId = null;
  updateTaskCount();
}

// Shows how many tasks are not checked off.
function updateTaskCount() {
  let left = 0;

  for (let i = 0; i < tasks.length; i++) {
    if (!tasks[i].done) {
      left = left + 1;
    }
  }

  let word = "tasks";
  if (left === 1) {
    word = "task";
  }

  taskCountText.textContent = left + " " + word + " left";
}

// ==============================
// STORAGE
// localStorage keeps strings in the browser after a refresh.
// JSON.stringify turns our data into text. JSON.parse turns it back.
// ==============================

// Saves the to-do list.
function saveTasks() {
  localStorage.setItem("lockdin-tasks", JSON.stringify(tasks));
}

// Loads the to-do list. If nothing was saved, start with an empty list.
function loadTasks() {
  const saved = localStorage.getItem("lockdin-tasks");

  if (!saved) {
    tasks = [];
    return;
  }

  tasks = JSON.parse(saved);
}

// Returns today's date as text, for example "2026-11-24".
function getToday() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  return now.getFullYear() + "-" + month + "-" + day;
}

// Saves today's focus-session count.
function saveSessions() {
  const data = {
    date: getToday(),
    count: sessionCount
  };
  localStorage.setItem("lockdin-sessions", JSON.stringify(data));
}

// Loads the session count. A count from another day is reset to zero.
function loadSessions() {
  const saved = localStorage.getItem("lockdin-sessions");
  const today = getToday();

  if (!saved) {
    sessionCount = 0;
    return;
  }

  const data = JSON.parse(saved);
  if (data.date === today) {
    sessionCount = data.count;
  } else {
    sessionCount = 0;
    saveSessions();
  }
}

// Saves "light" or "dark".
function saveTheme(theme) {
  localStorage.setItem("lockdin-theme", theme);
}

// Reads the saved theme. Light is used the first time.
function loadTheme() {
  const saved = localStorage.getItem("lockdin-theme");

  if (saved === "dark") {
    return "dark";
  }
  return "light";
}

// ==============================
// THEME
// ==============================

// Applies light or dark colors and updates the toggle button.
function applyTheme(theme) {
  document.body.setAttribute("data-theme", theme);

  if (theme === "dark") {
    themeButton.textContent = "Light mode";
  } else {
    themeButton.textContent = "Dark mode";
  }
}

// Flips between light and dark, then saves the choice.
function toggleTheme() {
  const current = document.body.getAttribute("data-theme");

  if (current === "dark") {
    applyTheme("light");
    saveTheme("light");
  } else {
    applyTheme("dark");
    saveTheme("dark");
  }
}

// ==============================
// SETUP
// Connects the buttons, then loads saved data and draws the page.
// ==============================

// Listens for clicks and the Enter key.
function setupEvents() {
  startButton.addEventListener("click", toggleTimer);
  resetButton.addEventListener("click", resetTimer);
  addButton.addEventListener("click", addTask);
  themeButton.addEventListener("click", toggleTheme);

  taskInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      addTask();
    }
  });

  const modeButtons = document.querySelectorAll(".mode-button");
  for (let i = 0; i < modeButtons.length; i++) {
    modeButtons[i].addEventListener("click", function () {
      const newMode = modeButtons[i].getAttribute("data-mode");
      setMode(newMode);
    });
  }
}

// Starting point: load saved data, then show the timer and tasks.
function startApp() {
  loadTasks();
  loadSessions();
  applyTheme(loadTheme());
  setupEvents();
  updateModeButtons();
  updateSessionText();
  updateDisplay();
  renderTasks();
}

startApp();
