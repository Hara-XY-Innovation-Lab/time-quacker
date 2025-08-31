// Centralized event system for inter-module communication

class EventEmitter {
  constructor() {
    this.events = {};
  }

  // Subscribe to an event
  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
    
    // Return unsubscribe function
    return () => {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    };
  }

  // Emit an event with data
  emit(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(callback => callback(data));
    }
  }

  // Subscribe to an event once
  once(event, callback) {
    const unsubscribe = this.on(event, (data) => {
      callback(data);
      unsubscribe();
    });
    return unsubscribe;
  }

  // Remove all listeners for an event
  removeAllListeners(event) {
    if (this.events[event]) {
      delete this.events[event];
    }
  }
}

// Create a singleton instance
const eventSystem = new EventEmitter();

export default eventSystem;