const http = require('http')

// Lazy-load the Express app to avoid cold-start hangs
let _app = null

module.exports = async (req, res) => {
  try {
    if (!_app) {
      console.log('[entry] Loading _server.js bundle...')
      const mod = require('./_server.js')
      _app = mod.default || mod
      console.log('[entry] Bundle loaded, app type:', typeof _app)
    }
    return _app(req, res)
  } catch (err) {
    console.error('[entry] Fatal:', err.message, err.stack?.slice(0, 500))
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({
      error: err.message,
      code: err.code,
      stack: err.stack?.split('\n').slice(0, 5),
    }))
  }
}
