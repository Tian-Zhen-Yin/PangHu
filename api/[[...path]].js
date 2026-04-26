// Minimal diagnostic wrapper — catches module-level crashes
const http = require('http')

module.exports = (req, res) => {
  try {
    const app = require('./server.js').default
    return app(req, res)
  } catch (err) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({
      error: err.message,
      stack: err.stack?.split('\n').slice(0, 10),
      modules: {
        prisma: (() => { try { require('@prisma/client'); return 'ok' } catch(e) { return e.message } })(),
        adapter: (() => { try { require('@prisma/adapter-pg'); return 'ok' } catch(e) { return e.message } })(),
        pg: (() => { try { require('pg'); return 'ok' } catch(e) { return e.message } })(),
      },
      env: {
        VERCEL: !!process.env.VERCEL,
        DATABASE_URL: !!process.env.DATABASE_URL,
        JWT_SECRET: !!process.env.JWT_SECRET,
      }
    }))
  }
}
