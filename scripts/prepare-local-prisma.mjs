import { readFile, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// يحوّل schema.prisma (postgresql) إلى نسخة محلية SQLite ثم يولّد العميل ويزامن القاعدة.
// يطابق نمط مشاريع منارة/محراب.

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourcePath = path.join(root, 'prisma', 'schema.prisma')
const localPath = path.join(root, 'prisma', 'schema.local.prisma')
const databaseUrl = process.env.DATABASE_URL || 'file:./dev.db'
const generateOnly = process.argv.includes('--generate-only')
const forceReset = process.argv.includes('--force-reset')

if (!databaseUrl.startsWith('file:')) {
  console.log('DATABASE_URL is PostgreSQL; skipping local SQLite preparation.')
  process.exit(0)
}

const source = await readFile(sourcePath, 'utf8')
const localSchema = source.replace(
  /provider\s*=\s*"postgresql"/,
  'provider = "sqlite"'
)

await writeFile(localPath, localSchema)

const pushArgs = ['db', 'push', '--schema', localPath, '--skip-generate']
if (forceReset) pushArgs.push('--force-reset', '--accept-data-loss')

const commands = [['generate', '--schema', localPath]]
if (!generateOnly) {
  commands.push(pushArgs)
}

for (const args of commands) {
  const result = spawnSync(
    process.execPath,
    [path.join(root, 'node_modules', 'prisma', 'build', 'index.js'), ...args],
    {
      cwd: root,
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: 'inherit',
    }
  )
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status || 1)
}
