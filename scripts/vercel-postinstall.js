const { execSync } = require('child_process')
const path = require('path')

const schemaPath = path.join(__dirname, '..', 'backend', 'prisma', 'schema.prisma')
const isVercel = !!process.env.VERCEL

// On Vercel: generate without native engine to stay under 250MB function limit
// On local: generate normally with native engine
const engineFlag = isVercel ? '--no-engine' : ''
execSync(
  `npx prisma generate --schema=${schemaPath} ${engineFlag} --no-hints`,
  { stdio: 'inherit' }
)
