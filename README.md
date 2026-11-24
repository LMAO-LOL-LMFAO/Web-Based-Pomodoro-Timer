# Lockd-In

A small Pomodoro timer with a to-do list. It is plain HTML, CSS, and JavaScript, so there is nothing to install.

## How to run

1. Open the project folder.
2. Double-click `index.html` (or open it in Chrome, Firefox, or Edge).

The timer, tasks, session count, and light/dark theme are saved in the browser with `localStorage`.

## What it does

- **Focus** is 25 minutes, **Short Break** is 5 minutes, and **Long Break** is 15 minutes.
- When a round hits 0:00, the app beeps, shows a message, and switches mode. Every 4th focus session is followed by a long break.
- Tasks can be added, checked off, and deleted. Empty tasks are not added.
- The tab title shows the time left, for example `24:13 - Focus`.
