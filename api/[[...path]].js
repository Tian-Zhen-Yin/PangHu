const http = require('http')

module.exports = (req, res) => {
  try {
    const app = require('./_server.js').default
    return app(req, res)
  } catch (err) {
    console.error('API handler error:', err)
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Internal Server Error' }))
  }
}
