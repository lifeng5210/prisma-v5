import { enginesVersion } from '@prisma/engines-version'
import { BinaryType, download } from '@prisma/fetch-engine'

import { ensureBinariesExist, getCliQueryEngineBinaryType, getEnginesPath } from '..'

jest.mock('@prisma/fetch-engine', () => ({
  ...jest.requireActual('@prisma/fetch-engine'),
  download: jest.fn().mockResolvedValue({}),
}))

const originalEnv = { ...process.env }

afterEach(() => {
  process.env = { ...originalEnv }
  jest.clearAllMocks()
})

describe('native engine selection', () => {
  test.each([
    [undefined, BinaryType.QueryEngineLibrary],
    ['library', BinaryType.QueryEngineLibrary],
    ['binary', BinaryType.QueryEngineBinary],
    ['invalid', BinaryType.QueryEngineLibrary],
  ])('selects %s without changing the default library engine', (value, expected) => {
    if (value === undefined) delete process.env.PRISMA_CLI_QUERY_ENGINE_TYPE
    else process.env.PRISMA_CLI_QUERY_ENGINE_TYPE = value
    expect(getCliQueryEngineBinaryType()).toBe(expected)
  })

  test.each([
    ['library', BinaryType.QueryEngineLibrary],
    ['binary', BinaryType.QueryEngineBinary],
  ])('requests %s and Schema Engine from the same revision', async (type, queryEngine) => {
    process.env.PRISMA_CLI_QUERY_ENGINE_TYPE = type
    process.env.PRISMA_CLI_BINARY_TARGETS = 'debian-openssl-3.0.x,windows'

    await ensureBinariesExist()

    expect(download).toHaveBeenCalledWith({
      binaries: {
        [queryEngine]: getEnginesPath(),
        [BinaryType.SchemaEngineBinary]: getEnginesPath(),
      },
      showProgress: true,
      version: enginesVersion,
      failSilent: false,
      binaryTargets: ['debian-openssl-3.0.x', 'windows'],
    })
  })
})
