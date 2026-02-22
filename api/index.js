// Vercel serverless entry that proxies to the compiled Nest lambda
module.exports = require('../dist/lambda').default;
