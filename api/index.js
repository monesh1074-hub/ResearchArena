const app = require('../contention-guard/server/src/app');

module.exports = (req, res) => {
  return app(req, res);
};
