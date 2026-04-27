const http = require('http')

module.exports = (req, res) => {
  try {
    const app = require('./_server.js').default
    return app(req, res)
  } catch (err) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({
      error: err.message,
      stack: err.stack?.split('\n').slice(0, 10),
      code: err.code,
    }))
  }
}
