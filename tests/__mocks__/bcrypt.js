module.exports = {
  hash: async (value) => `hashed:${value}`,
  compare: async (candidate, hashed) => hashed === `hashed:${candidate}`,
};
