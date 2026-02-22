const LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const configuredLevel = String(process.env.LOG_LEVEL || 'info').toLowerCase();
const minLevel = Object.prototype.hasOwnProperty.call(LEVELS, configuredLevel)
  ? LEVELS[configuredLevel]
  : LEVELS.info;

const normalizeValue = (value) => {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack || '',
    };
  }
  return value;
};

const safeSerialize = (payload) => {
  const seen = new WeakSet();
  return JSON.stringify(payload, (_key, value) => {
    const normalized = normalizeValue(value);
    if (normalized && typeof normalized === 'object') {
      if (seen.has(normalized)) return '[Circular]';
      seen.add(normalized);
    }
    return normalized;
  });
};

const log = ({ level = 'info', message = '', data = {} }) => {
  const targetLevel = LEVELS[level] || LEVELS.info;
  if (targetLevel < minLevel) return;

  const payload = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...data,
  };
  // eslint-disable-next-line no-console
  console.log(safeSerialize(payload));
};

module.exports = {
  debug: (message, data) => log({ level: 'debug', message, data }),
  info: (message, data) => log({ level: 'info', message, data }),
  warn: (message, data) => log({ level: 'warn', message, data }),
  error: (message, data) => log({ level: 'error', message, data }),
};
