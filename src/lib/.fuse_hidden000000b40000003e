type LogLevel = 'debug' | 'info' | 'warning' | 'error' | 'critical';

interface LogContext {
  [key: string]: any;
}

function formatLog(
  level: LogLevel,
  message: string,
  context?: LogContext
) {
  const timestamp = new Date().toISOString();
  const log = {
    timestamp,
    level,
    message,
    context: context || {},
  };

  return JSON.stringify(log);
}

export const logger = {
  debug: (message: string, context?: LogContext) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(formatLog('debug', message, context));
    }
  },

  info: (message: string, context?: LogContext) => {
    console.log(formatLog('info', message, context));
  },

  warning: (message: string, context?: LogContext) => {
    console.warn(formatLog('warning', message, context));
  },

  warn: (message: string, context?: LogContext) => {
    console.warn(formatLog('warning', message, context));
  },

  error: (message: string, context?: LogContext) => {
    console.error(formatLog('error', message, context));
  },

  critical: (message: string, context?: LogContext) => {
    console.error(formatLog('critical', message, context));
  },

  /**
   * Redact sensitive keys from objects
   */
  redact: (obj: any): any => {
    const sensitiveKeys = [
      'password',
      'token',
      'secret',
      'api_key',
      'apiKey',
      'authorization',
      'credit_card',
      'ssn',
    ];

    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => logger.redact(item));
    }

    const redacted = { ...obj };
    for (const key of Object.keys(redacted)) {
      if (sensitiveKeys.some((k) => key.toLowerCase().includes(k))) {
        redacted[key] = '***REDACTED***';
      } else if (typeof redacted[key] === 'object') {
        redacted[key] = logger.redact(redacted[key]);
      }
    }

    return redacted;
  },
};

export default logger;
