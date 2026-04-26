const { execSync } = require('child_process')
const path = require('path')

const schemaPath = path.join(__dirname, '..', 'backend', 'prisma', 'schema.prisma')
const isVercel = !!process.env.VERCEL
const engineFlag = isVercel ? '--no-engine' : ''

execSync(
  `npx prisma generate --schema=${schemaPath} ${engineFlag} --no-hints`,
  { stdio: 'inherit' }
)
