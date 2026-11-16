import { Providers } from '../_utils/providers'
import { waitFor } from '../_utils/tests/waitFor'
import { NewPrismaClient } from '../_utils/types'
import testMatrix from './_matrix'
// @ts-ignore
import type { Prisma as PrismaNamespace, PrismaClient } from './node_modules/@prisma/client'

declare let newPrismaClient: NewPrismaClient<typeof PrismaClient>
declare let Prisma: typeof PrismaNamespace

testMatrix.setupTestSuite(
  ({ provider }, _suiteMeta, _clientMeta) => {
    const queries: string[] = []
    let prisma: PrismaClient<PrismaNamespace.PrismaClientOptions, 'query'>

    beforeAll(() => {
      prisma = newPrismaClient({
        log: [
          {
            emit: 'event',
            level: 'query',
          },
        ],
      })

      prisma.$on('query', (event) => {
        queries.push(event.query)
      })
    })

    afterEach(() => {
      queries.length = 0
    })

    const testIsolationLevel = (
      name: string,
      { level, expectSql }: { level: () => PrismaNamespace.TransactionIsolationLevel; expectSql: string },
    ) => {
      test(name, async () => {
        if (provider === Providers.KINGBASE_ORACLE && ['ReadUncommitted', 'RepeatableRead'].includes(name)) {
          await expect(async () => {
            await prisma.$transaction([prisma.user.findFirst({}), prisma.user.findFirst({})], {
              isolationLevel: level(),
            })
          }).rejects.toThrow('Invalid enum value')
          expect(queries).toEqual([])
          return
        }
        await prisma.$transaction([prisma.user.findFirst({}), prisma.user.findFirst({})], {
          isolationLevel: level(),
        })

        await waitFor(() => {
          expect(queries).toContain(expectSql)
        })
      })
    }

    testIsolationLevel('ReadUncommitted', {
      // @ts-test-if: provider !== Providers.KINGBASE_ORACLE
      level: () => Prisma.TransactionIsolationLevel.ReadUncommitted,
      expectSql: 'SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED',
    })

    testIsolationLevel('ReadCommitted', {
      level: () => Prisma.TransactionIsolationLevel.ReadCommitted,
      expectSql: 'SET TRANSACTION ISOLATION LEVEL READ COMMITTED',
    })

    testIsolationLevel('RepeatableRead', {
      // @ts-test-if: provider !== Providers.KINGBASE_ORACLE
      level: () => Prisma.TransactionIsolationLevel.RepeatableRead,
      expectSql: 'SET TRANSACTION ISOLATION LEVEL REPEATABLE READ',
    })

    testIsolationLevel('Serializable', {
      level: () => Prisma.TransactionIsolationLevel.Serializable,
      expectSql: 'SET TRANSACTION ISOLATION LEVEL SERIALIZABLE',
    })

    test('default value generates no SET TRANSACTION ISOLATION LEVEL statements', async () => {
      await prisma.$transaction([prisma.user.findFirst({}), prisma.user.findFirst({})])

      expect(queries.find((q) => q.includes('SET TRANSACTION ISOLATION LEVEL'))).toBeUndefined()
    })

    test('invalid level generates run- and compile- time error', async () => {
      // @ts-expect-error
      const result = prisma.$transaction([prisma.user.findFirst({}), prisma.user.findFirst({})], {
        isolationLevel: 'yes',
      })

      await expect(result).rejects.toMatchPrismaErrorInlineSnapshot(`
        "
        Invalid \`prisma.$transaction([prisma.user.findFirst()\` invocation in
        /client/tests/functional/batch-transaction-isolation-level/tests.ts:0:0

          XX 
          XX test('invalid level generates run- and compile- time error', async () => {
          XX   // @ts-expect-error
        → XX   const result = prisma.$transaction([prisma.user.findFirst(
        Inconsistent column data: Conversion failed: Invalid isolation level \`yes\`"
      `)
    })
  },
  {
    optOut: {
      from: ['mongodb', 'sqlite', 'cockroachdb'],
      reason: `
        mongo - Not supported
        sqlite, cockroach - Support only serializable level, never generate sql for setting isolation level
      `,
    },
    skipDefaultClientInstance: true,
  },
)
