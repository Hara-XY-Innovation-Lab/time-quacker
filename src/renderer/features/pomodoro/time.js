import { speak } from './speech.js';
import { updateTimerUI } from './timer.js';

export function updateTime(statusEl, timeEl) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
  updateTimerUI(timeStr, timeEl);
  statusEl.textContent = "Time shown";
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';
  speak(`${greeting}. The time is ${timeStr}`);
  setTimeout(() => timeEl.classList.add('hidden'), 5000);
}