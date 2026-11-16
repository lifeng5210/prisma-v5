import { enginesVersion } from '@prisma/engines-version'

import { BinaryType } from '../BinaryType'
import { getDownloadUrl } from '../utils'

const originalEnv = { ...process.env }

afterEach(() => {
  process.env = { ...originalEnv }
})

describe('custom native engine URLs', () => {
  test('retains the original remote fallback until the v5 artifacts are published', () => {
    delete process.env.PRISMA_BINARIES_MIRROR
    delete process.env.PRISMA_ENGINES_MIRROR
    expect(
      getDownloadUrl({
        channel: 'all_commits',
        version: enginesVersion,
        binaryTarget: 'debian-openssl-3.0.x',
        binaryName: BinaryType.SchemaEngineBinary,
      }),
    ).toBe(`https://binaries.prisma.sh/all_commits/${enginesVersion}/debian-openssl-3.0.x/schema-engine.gz`)
  })

  test.each([
    [BinaryType.QueryEngineBinary, 'debian-openssl-3.0.x', 'query-engine.gz'],
    [BinaryType.SchemaEngineBinary, 'debian-openssl-3.0.x', 'schema-engine.gz'],
    [BinaryType.QueryEngineLibrary, 'debian-openssl-3.0.x', 'libquery_engine.so.node.gz'],
    [BinaryType.QueryEngineBinary, 'windows', 'query-engine.exe.gz'],
    [BinaryType.SchemaEngineBinary, 'windows', 'schema-engine.exe.gz'],
    [BinaryType.QueryEngineLibrary, 'windows', 'query_engine.dll.node.gz'],
    [BinaryType.QueryEngineLibrary, 'darwin-arm64', 'libquery_engine.dylib.node.gz'],
  ] as const)('locates %s for %s by revision and artifact name', (binaryName, binaryTarget, file) => {
    delete process.env.PRISMA_BINARIES_MIRROR
    process.env.PRISMA_ENGINES_MIRROR = 'https://example.test/kes-v5'

    expect(getDownloadUrl({ channel: 'all_commits', version: enginesVersion, binaryTarget, binaryName })).toBe(
      `https://example.test/kes-v5/all_commits/${enginesVersion}/${binaryTarget}/${file}`,
    )
  })

  test('preserves the legacy mirror priority', () => {
    process.env.PRISMA_BINARIES_MIRROR = 'https://example.test/legacy'
    process.env.PRISMA_ENGINES_MIRROR = 'https://example.test/engines'
    expect(
      getDownloadUrl({
        channel: 'all_commits',
        version: enginesVersion,
        binaryTarget: 'debian-openssl-3.0.x',
        binaryName: BinaryType.SchemaEngineBinary,
      }),
    ).toBe(`https://example.test/legacy/all_commits/${enginesVersion}/debian-openssl-3.0.x/schema-engine.gz`)
  })
})
