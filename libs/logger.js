const log = ({ level = 'info', message = '', data = {} }) => {
  const payload = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...data,
  };
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(payload));
};

module.exports = {
  info: (message, data) => log({ level: 'info', message, data }),
  warn: (message, data) => log({ level: 'warn', message, data }),
  error: (message, data) => log({ level: 'error', message, data }),
};
