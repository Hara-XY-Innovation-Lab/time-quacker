// Reusable Timer Display Component

export class TimerDisplay {
  constructor(containerEl) {
    this.containerEl = containerEl;
    this.render();
  }

  render() {
    this.containerEl.innerHTML = `
      <div class="timer-display">
        <div class="time" id="time">25:00</div>
        <div class="status" id="status">Ready to start</div>
      </div>
    `;
    
    this.timeEl = this.containerEl.querySelector('#time');
    this.statusEl = this.containerEl.querySelector('#status');
  }

  updateTime(time) {
    if (this.timeEl) {
      this.timeEl.textContent = time;
    }
  }

  updateStatus(status) {
    if (this.statusEl) {
      this.statusEl.textContent = status;
    }
  }

  show() {
    this.containerEl.style.display = 'block';
  }

  hide() {
    this.containerEl.style.display = 'none';
  }
}