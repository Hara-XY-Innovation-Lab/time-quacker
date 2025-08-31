// Centralized state management system

class StateManager {
  constructor() {
    this.state = {};
    this.listeners = {};
  }

  // Get a state value
  get(key) {
    return this.state[key];
  }

  // Set a state value and notify listeners
  set(key, value) {
    this.state[key] = value;
    if (this.listeners[key]) {
      this.listeners[key].forEach(callback => callback(value));
    }
  }

  // Subscribe to state changes
  subscribe(key, callback) {
    if (!this.listeners[key]) {
      this.listeners[key] = [];
    }
    this.listeners[key].push(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners[key] = this.listeners[key].filter(cb => cb !== callback);
    };
  }

  // Get the entire state
  getAll() {
    return { ...this.state };
  }

  // Set multiple state values
  setMultiple(updates) {
    Object.keys(updates).forEach(key => {
      this.set(key, updates[key]);
    });
  }
}

// Create a singleton instance
const stateManager = new StateManager();

export default stateManager;