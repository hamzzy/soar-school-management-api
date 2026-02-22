module.exports = ({ managers }) => {
  return ({ req, next }) => {
    const meta = {
      requestId: req.requestId || '',
      correlationId: req.correlationId || req.requestId || '',
      ip: req.clientIp || req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    };
    next(meta);
  };
};
