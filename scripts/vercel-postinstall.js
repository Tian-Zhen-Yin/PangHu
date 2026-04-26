const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const schemaPath = path.join(__dirname, '..', 'backend', 'prisma', 'schema.prisma')
const isVercel = !!process.env.VERCEL

if (isVercel) {
  // On Vercel: generate only for the rhel target to keep size small
  const schema = fs.readFileSync(schemaPath, 'utf8')
  const patched = schema.replace(
    /binaryTargets\s*=\s*\[.*?\]/,
    'binaryTargets = ["rhel-openssl-3.0.x"]'
  )
  fs.writeFileSync(schemaPath, patched, 'utf8')
  console.log('Patched schema for Vercel: binaryTargets = ["rhel-openssl-3.0.x"]')
}

try {
  execSync(
    `npx prisma generate --schema=${schemaPath} --no-hints`,
    { stdio: 'inherit' }
  )
} finally {
  if (isVercel) {
    // Restore original schema
    execSync(`git checkout -- ${schemaPath}`, { stdio: 'ignore' })
  }
}
