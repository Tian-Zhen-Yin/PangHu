const { execSync } = require('child_process')
const path = require('path')

const schemaPath = path.join(__dirname, '..', 'backend', 'prisma', 'schema.prisma')

execSync(
  `npx prisma generate --schema=${schemaPath} --no-hints`,
  { stdio: 'inherit' }
)
