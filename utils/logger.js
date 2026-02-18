import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVL ?? 'info',
  transport:
    process.env.NODE_ENV !== 'production'
      ? {
          target: 'pino-pretty',
          options: { colorize: true, ignore: 'pid,hostname' },
        }
      : undefined,
  redact: {
    paths: [
      'password',
      'password_hash',
      'currentPassword',
      'newPassword',
      'token',
    ],
    censor: '[REDACTED]',
  },
});

export default logger;
