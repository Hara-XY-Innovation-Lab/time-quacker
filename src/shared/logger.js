// Centralized logging utility

export class Logger {
  constructor(prefix = '') {
    this.prefix = prefix;
  }

  info(message, data = null) {
    this.log('INFO', message, data);
  }

  warn(message, data = null) {
    this.log('WARN', message, data);
  }

  error(message, error = null) {
    this.log('ERROR', message, error);
  }

  debug(message, data = null) {
    this.log('DEBUG', message, data);
  }

  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} [${level}] ${this.prefix ? `[${this.prefix}] ` : ''}${message}`;
    
    // In production, we might want to disable debug logging
    if (level === 'DEBUG' && process.env.NODE_ENV === 'production') {
      return;
    }
    
    // Log to console
    switch (level) {
      case 'ERROR':
        console.error(logMessage, data);
        break;
      case 'WARN':
        console.warn(logMessage, data);
        break;
      case 'DEBUG':
        console.debug(logMessage, data);
        break;
      default:
        console.log(logMessage, data);
    }
    
    // TODO: Add remote logging capability
  }
}

// Create default logger instance
const logger = new Logger();

export default logger;