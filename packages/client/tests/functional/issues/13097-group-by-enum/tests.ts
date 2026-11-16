import { Providers } from '../../_utils/providers'
import testMatrix from './_matrix'
// @ts-ignore
import type { PrismaClient } from './node_modules/@prisma/client'

declare let prisma: PrismaClient

/**
 * Regression test for #13097
 * groupBy on enum fields
 */
testMatrix.setupTestSuite(
  ({ provider }) => {
    beforeAll(async () => {
      if (
        provider !== Providers.MYSQL &&
        provider !== Providers.KINGBASE_MYSQL &&
        provider !== Providers.KINGBASE_ORACLE
      ) {
        await prisma.resource.create({
          data: {
            enumValue: 'A',
            // @ts-test-if: provider !== Providers.MYSQL && provider !== Providers.KINGBASE_MYSQL && provider !== Providers.KINGBASE_ORACLE
            enumArray: ['A'],
          },
        })
      } else {
        await prisma.resource.create({
          data: {
            enumValue: 'A',
          },
        })
      }
    })

    test('groupBy on enumValue field', async () => {
      const result = await prisma.resource.groupBy({
        by: ['enumValue'],
      })

      expect(result).toMatchInlineSnapshot(`
        [
          {
            "enumValue": "A",
          },
        ]
      `)
    })

    testIf(
      provider !== Providers.MYSQL && provider !== Providers.KINGBASE_MYSQL && provider !== Providers.KINGBASE_ORACLE,
    )('groupBy on enumArray field', async () => {
      const result = await prisma.resource.groupBy({
        // @ts-test-if: provider !== Providers.MYSQL && provider !== Providers.KINGBASE_MYSQL && provider !== Providers.KINGBASE_ORACLE
        by: ['enumArray'],
      })

      expect(result).toMatchInlineSnapshot(`
        [
          {
            "enumArray": [
              "A",
            ],
          },
        ]
      `)
    })
  },
  {
    optOut: {
      from: ['sqlite', 'sqlserver'],
      reason: "SQLite and SQLServer don't support enums",
    },
  },
)
