// Reusable Button Component

export class Button {
  constructor(containerEl, options = {}) {
    this.containerEl = containerEl;
    this.text = options.text || '';
    this.className = options.className || 'btn';
    this.onClick = options.onClick || (() => {});
    this.disabled = options.disabled || false;
    this.render();
  }

  render() {
    this.containerEl.innerHTML = `
      <button class="${this.className}" ${this.disabled ? 'disabled' : ''}>
        ${this.text}
      </button>
    `;
    
    this.buttonEl = this.containerEl.querySelector('button');
    this.buttonEl.addEventListener('click', this.onClick);
  }

  setText(text) {
    this.text = text;
    this.buttonEl.textContent = text;
  }

  setDisabled(disabled) {
    this.disabled = disabled;
    if (disabled) {
      this.buttonEl.setAttribute('disabled', 'disabled');
    } else {
      this.buttonEl.removeAttribute('disabled');
    }
  }

  setClassName(className) {
    this.className = className;
    this.buttonEl.className = className;
  }

  destroy() {
    if (this.buttonEl) {
      this.buttonEl.removeEventListener('click', this.onClick);
    }
  }
}