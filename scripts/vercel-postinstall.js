const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const rootDir = path.join(__dirname, '..')
const schemaPath = path.join(rootDir, 'backend', 'prisma', 'schema.prisma')

// Generate Prisma client (outputs to backend/node_modules/.prisma/client by default)
execSync(
  `npx prisma generate --schema="${schemaPath}" --no-hints`,
  { stdio: 'inherit', cwd: rootDir }
)

// Copy the generated .prisma/client to root node_modules so the Vercel function
// can resolve require('@prisma/client') → require('.prisma/client')
const src = path.join(rootDir, 'backend', 'node_modules', '.prisma')
const dest = path.join(rootDir, 'node_modules', '.prisma')

if (fs.existsSync(src)) {
  fs.cpSync(src, dest, { recursive: true })
  console.log('[postinstall] Copied .prisma/client to root node_modules')
}
