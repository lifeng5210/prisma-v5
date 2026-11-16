import { expectTypeOf } from 'expect-type'

import { Providers } from '../../_utils/providers'
import testMatrix from './_matrix'
// @ts-ignore
import type { PrismaClient } from './node_modules/@prisma/client'
// @ts-ignore
import * as Sql from './node_modules/@prisma/client/sql'

declare let prisma: PrismaClient
declare let sql: typeof Sql

testMatrix.setupTestSuite(
  ({ provider }) => {
    beforeAll(async () => {
      await prisma.user.create({
        data: {
          role: 'ADMIN',
          favoriteAnimal: 'STEVE',
        },
      })
    })

    test('returns enums that are mapped to invalid JS identifier correctly', async () => {
      const result = await prisma.$queryRawTyped(sql.getUser())
      expect(result).toMatchInlineSnapshot(`
        [
          {
            "favoriteAnimal": "STEVE",
            "role": "ADMIN",
          },
        ]
      `)

      if (provider === Providers.KINGBASE_ORACLE) {
        // Oracle enums are stored as character columns, with conservative nullable SQL descriptions.
        // @ts-test-if: provider === Providers.KINGBASE_ORACLE
        expectTypeOf(result[0].favoriteAnimal).toEqualTypeOf<string | null>()
        // @ts-test-if: provider === Providers.KINGBASE_ORACLE
        expectTypeOf(result[0].role).toEqualTypeOf<string | null>()
      } else {
        // @ts-test-if: provider !== Providers.KINGBASE_ORACLE
        expectTypeOf(result[0].favoriteAnimal).toEqualTypeOf<'CAT' | 'DOG' | 'STEVE'>()
        // @ts-test-if: provider !== Providers.KINGBASE_ORACLE
        expectTypeOf(result[0].favoriteAnimal).toEqualTypeOf<Sql.$DbEnums.Animal>()

        // @ts-test-if: provider !== Providers.KINGBASE_ORACLE
        expectTypeOf(result[0].role).toEqualTypeOf<'ADMIN' | 'USER'>()
        // @ts-test-if: provider !== Providers.KINGBASE_ORACLE
        expectTypeOf(result[0].role).toEqualTypeOf<Sql.$DbEnums['user-role']>()
      }
    })
  },
  {
    optOut: {
      from: ['sqlite', 'mysql', 'mongodb', 'sqlserver', 'kingbase-mysql'],
      reason: 'Test need both enums and typed-sql support',
    },
  },
)
