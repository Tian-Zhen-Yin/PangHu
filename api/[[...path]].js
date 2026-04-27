// Vercel catch-all serverless function entry point

let _app = null

module.exports = async (req, res) => {
  // Quick health check before loading the bundle
  if (req.url === '/api/health') {
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({
      status: 'ok',
      env: {
        VERCEL: !!process.env.VERCEL,
        DATABASE_URL: !!process.env.DATABASE_URL,
        JWT_SECRET: !!process.env.JWT_SECRET,
      }
    }))
    return
  }

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
