const { Notification } = require('electron');
const Store = require('electron-store');

class WaterReminderService {
  constructor() {
    // Initialize electron-store for data persistence
    this.store = new Store({
      name: 'water-intake',
      defaults: {
        dailyGoal: 2000, // ml
        reminderInterval: 3600000, // 1 hour in milliseconds
        lastReset: new Date().toDateString(),
        dailyIntake: [],
        weeklyIntake: {}
      }
    });
    
    this.reminderInterval = null;
    this.isReminderActive = false;
    
    // Reset data if it's a new day
    this.checkAndResetDailyData();
  }
  
  // Check if we need to reset daily data
  checkAndResetDailyData() {
    const today = new Date().toDateString();
    const lastReset = this.store.get('lastReset');
    
    if (today !== lastReset) {
      this.store.set('lastReset', today);
      this.store.set('dailyIntake', []);
    }
  }
  
  // Start water reminders
  startReminders() {
    if (this.isReminderActive) return;
    
    this.isReminderActive = true;
    const interval = this.store.get('reminderInterval');
    
    this.sendWaterReminder(); // Send initial reminder
    this.reminderInterval = setInterval(() => {
      this.sendWaterReminder();
    }, interval);
  }
  
  // Stop water reminders
  stopReminders() {
    if (this.reminderInterval) {
      clearInterval(this.reminderInterval);
      this.reminderInterval = null;
    }
    this.isReminderActive = false;
  }
  
  // Send water reminder notification
  sendWaterReminder() {
    const notification = new Notification({
      title: 'Time to Drink Water 💧',
      body: 'Stay hydrated! Please drink a glass of water.',
      actions: [
        { 
          type: 'button', 
          text: 'Drank! 🥛' 
        }
      ]
    });
    
    notification.on('action', () => {
      this.logWaterIntake();
    });
    
    notification.show();
  }
  
  // Log water intake (default 250ml per event)
  logWaterIntake(amount = 250) {
    this.checkAndResetDailyData();
    
    const intakeEvent = {
      time: Date.now(),
      amount: amount
    };
    
    // Add to daily intake
    const dailyIntake = this.store.get('dailyIntake');
    dailyIntake.push(intakeEvent);
    this.store.set('dailyIntake', dailyIntake);
    
    // Update weekly intake
    const today = new Date().toISOString().slice(0, 10);
    const weeklyIntake = this.store.get('weeklyIntake', {});
    
    if (!weeklyIntake[today]) {
      weeklyIntake[today] = [];
    }
    
    weeklyIntake[today].push(intakeEvent);
    this.store.set('weeklyIntake', weeklyIntake);
    
    // Show confirmation notification
    new Notification({
      title: 'Water Logged!',
      body: `Great! You've logged ${amount}ml of water.`
    }).show();
  }
  
  // Get today's water intake statistics
  getTodaysStats() {
    this.checkAndResetDailyData();
    
    const dailyIntake = this.store.get('dailyIntake');
    const totalIntake = dailyIntake.reduce((sum, entry) => sum + entry.amount, 0);
    const dailyGoal = this.store.get('dailyGoal');
    const progress = dailyGoal > 0 ? Math.min(100, (totalIntake / dailyGoal) * 100) : 0;
    
    return {
      totalIntake,
      dailyGoal,
      progress,
      intakeEvents: dailyIntake.length
    };
  }
  
  // Get weekly statistics
  getWeeklyStats() {
    const weeklyIntake = this.store.get('weeklyIntake', {});
    const weeklyTotal = {};
    
    // Calculate total intake for each day
    for (const [date, intakes] of Object.entries(weeklyIntake)) {
      weeklyTotal[date] = intakes.reduce((sum, entry) => sum + entry.amount, 0);
    }
    
    return {
      dailyTotals: weeklyTotal,
      weeklyAverage: Object.values(weeklyTotal).reduce((sum, total) => sum + total, 0) / Object.keys(weeklyTotal).length || 0
    };
  }
  
  // Set reminder interval (in milliseconds)
  setReminderInterval(interval) {
    this.store.set('reminderInterval', interval);
    
    // Restart reminders if active
    if (this.isReminderActive) {
      this.stopReminders();
      this.startReminders();
    }
  }
  
  // Set daily water goal (in ml)
  setDailyGoal(goal) {
    this.store.set('dailyGoal', goal);
  }
  
  // Get current settings
  getSettings() {
    return {
      dailyGoal: this.store.get('dailyGoal'),
      reminderInterval: this.store.get('reminderInterval'),
      isReminderActive: this.isReminderActive
    };
  }
}

// Export singleton instance
module.exports = new WaterReminderService();