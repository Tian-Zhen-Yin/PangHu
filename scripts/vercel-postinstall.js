const path = require('path')
const fs = require('fs')

const rootDir = path.join(__dirname, '..')

// Copy the generated .prisma/client from backend to root node_modules so the
// Vercel function can resolve require('@prisma/client') → require('.prisma/client')
const src = path.join(rootDir, 'backend', 'node_modules', '.prisma')
const dest = path.join(rootDir, 'node_modules', '.prisma')

if (fs.existsSync(src)) {
  fs.cpSync(src, dest, { recursive: true })
  console.log('[postinstall] Copied .prisma/client to root node_modules')
}

// Remove non-RHEL engine binaries to reduce function size (Vercel runs on RHEL)
const prismaClientDirs = [
  path.join(rootDir, 'node_modules', '.prisma', 'client'),
  path.join(rootDir, 'backend', 'node_modules', '.prisma', 'client'),
]
for (const dir of prismaClientDirs) {
  if (!fs.existsSync(dir)) continue
  for (const file of fs.readdirSync(dir)) {
    if (file.includes('engine') && !file.includes('rhel-openssl-3.0.x')) {
      fs.rmSync(path.join(dir, file), { force: true })
      console.log(`[postinstall] Removed unused engine: ${file}`)
    }
  }
}

// Remove unnecessary files from @prisma/client/runtime to reduce function size
const prismaRuntimeDirs = [
  path.join(rootDir, 'node_modules', '@prisma', 'client', 'runtime'),
  path.join(rootDir, 'backend', 'node_modules', '@prisma', 'client', 'runtime'),
]
for (const dir of prismaRuntimeDirs) {
  if (!fs.existsSync(dir)) continue
  for (const file of fs.readdirSync(dir)) {
    // Source maps are not needed at runtime (~20MB saving total)
    if (file.endsWith('.map')) {
      fs.rmSync(path.join(dir, file), { force: true })
      console.log(`[postinstall] Removed Prisma runtime source map: ${file}`)
    }
    // Remove WASM engines for databases we don't use (only need PostgreSQL)
    if (file.includes('.cockroachdb') || file.includes('.mysql') || file.includes('.sqlite') || file.includes('.sqlserver')) {
      fs.rmSync(path.join(dir, file), { force: true })
      console.log(`[postinstall] Removed non-PostgreSQL WASM: ${file}`)
    }
  }
}
