import { speak } from './speech.js';

export function updateTimerUI(timeLeft, timeEl) {
  const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const secs = String(timeLeft % 60).padStart(2, '0');
  timeEl.textContent = `${mins}:${secs}`;
  timeEl.classList.remove('hidden');
}

export function updateTime(statusEl, timeEl) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
  timeEl.textContent = timeStr;
  timeEl.classList.remove('hidden');
  statusEl.textContent = "Time shown";
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';
  speak(`${greeting}. The time is ${timeStr}`);
  setTimeout(() => timeEl.classList.add('hidden'), 5000);
}
