import { enginesVersion } from '@prisma/engines-version'
import { getBinaryTargetForCurrentPlatform, getNodeAPIName } from '@prisma/get-platform'
import { createHash } from 'crypto'
import fs from 'fs/promises'
import { createServer, Server } from 'http'
import os from 'os'
import path from 'path'
import { gzipSync } from 'zlib'

import { BinaryType } from '../BinaryType'
import { download, getBinaryName } from '../download'
import * as utils from '../utils'

jest.mock('../../package.json', () => ({
  ...jest.requireActual('../../package.json'),
  enginesOverride: {},
}))

jest.mock('../utils', () => ({
  ...jest.requireActual('../utils'),
  getRootCacheDir: jest.fn(),
  getCacheDir: jest.fn(),
}))

const originalEnv = { ...process.env }
const hash = (value: Buffer) => createHash('sha256').update(value).digest('hex')
let directory: string
let server: Server | undefined

afterEach(async () => {
  if (server) await new Promise<void>((resolve) => server!.close(() => resolve()))
  server = undefined
  jest.restoreAllMocks()
  process.env = { ...originalEnv }
  if (directory) await fs.rm(directory, { recursive: true, force: true })
})

test('downloads all native forms with checksums and repairs files from an isolated cache', async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), 'kes-v5-download-'))
  const cache = path.join(directory, 'cache')
  jest.mocked(utils.getRootCacheDir).mockResolvedValue(cache)
  jest.mocked(utils.getCacheDir).mockImplementation(async (channel, version, target) => {
    const dir = path.join(cache, channel, version, target)
    await fs.mkdir(dir, { recursive: true })
    return dir
  })
  for (const env of [
    'PRISMA_QUERY_ENGINE_BINARY',
    'PRISMA_QUERY_ENGINE_LIBRARY',
    'PRISMA_SCHEMA_ENGINE_BINARY',
    'PRISMA_MIGRATION_ENGINE_BINARY',
    'PRISMA_BINARIES_MIRROR',
    'BINARY_DOWNLOAD_VERSION',
    'PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING',
  ])
    delete process.env[env]
  process.env.NO_PROXY = '127.0.0.1'
  const binaryTarget = await getBinaryTargetForCurrentPlatform()
  const names = [BinaryType.QueryEngineLibrary, BinaryType.QueryEngineBinary, BinaryType.SchemaEngineBinary]
  const fixtures = new Map<string, Buffer>()
  for (const name of names) {
    const file =
      name === BinaryType.QueryEngineLibrary
        ? getNodeAPIName(binaryTarget, 'url')
        : `${name}${binaryTarget === 'windows' ? '.exe' : ''}`
    const data = Buffer.from(`test engine ${name} ${enginesVersion}`)
    const zipped = gzipSync(data)
    const prefix = `/all_commits/${enginesVersion}/${binaryTarget}/${file}`
    fixtures.set(prefix + '.gz', zipped)
    fixtures.set(prefix + '.gz.sha256', Buffer.from(hash(zipped)))
    fixtures.set(prefix + '.sha256', Buffer.from(hash(data)))
  }
  const requests: string[] = []
  server = createServer((request, response) => {
    requests.push(request.url!)
    const data = fixtures.get(request.url!)
    response.statusCode = data ? 200 : 404
    if (data) {
      response.setHeader('Content-Length', data.length)
      response.setHeader('Last-Modified', new Date(0).toUTCString())
    }
    response.end(data)
  })
  await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve))
  const address = server.address() as { port: number }
  process.env.PRISMA_ENGINES_MIRROR = `http://127.0.0.1:${address.port}`
  const target = path.join(directory, 'engines with spaces')
  await fs.mkdir(target)
  const binaries = Object.fromEntries(names.map((name) => [name, target]))
  const options = { binaries, binaryTargets: [binaryTarget], version: enginesVersion }
  const paths = await download(options)
  for (const name of names) {
    const file = path.join(target, getBinaryName(name, binaryTarget))
    expect(paths[name]![binaryTarget]).toBe(file)
    expect(await fs.readFile(file, 'utf8')).toBe(`test engine ${name} ${enginesVersion}`)
    if (process.platform !== 'win32') expect((await fs.stat(file)).mode & 0o111).not.toBe(0)
  }
  expect(requests).toHaveLength(9)
  requests.length = 0
  const corrupted = paths[BinaryType.QueryEngineLibrary]![binaryTarget]
  await fs.writeFile(corrupted, 'corrupted target')
  await fs.unlink(paths[BinaryType.SchemaEngineBinary]![binaryTarget])
  await download(options)
  expect(await fs.readFile(corrupted, 'utf8')).toBe(`test engine ${BinaryType.QueryEngineLibrary} ${enginesVersion}`)
  expect(await fs.readFile(paths[BinaryType.SchemaEngineBinary]![binaryTarget], 'utf8')).toBe(
    `test engine ${BinaryType.SchemaEngineBinary} ${enginesVersion}`,
  )
  expect(requests).toEqual([])

  for (const [name, env] of [
    [BinaryType.QueryEngineBinary, 'PRISMA_QUERY_ENGINE_BINARY'],
    [BinaryType.QueryEngineLibrary, 'PRISMA_QUERY_ENGINE_LIBRARY'],
    [BinaryType.SchemaEngineBinary, 'PRISMA_SCHEMA_ENGINE_BINARY'],
  ])
    process.env[env] = paths[name]![binaryTarget]
  const overridePaths = await download({
    ...options,
    binaries: Object.fromEntries(names.map((name) => [name, path.join(directory, 'unused')])),
    version: 'not-downloaded',
  })
  expect(overridePaths).toEqual(paths)
  expect(requests).toEqual([])
}, 30_000)
