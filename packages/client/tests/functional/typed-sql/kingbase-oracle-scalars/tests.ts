import testMatrix from './_matrix'
// @ts-ignore
import type { Prisma as PrismaNamespace, PrismaClient } from './node_modules/@prisma/client'
// @ts-ignore
import * as Sql from './node_modules/@prisma/client/sql'

declare let prisma: PrismaClient
declare let Prisma: typeof PrismaNamespace
declare let sql: typeof Sql

const dateTime = new Date('2024-07-31T14:37:36.570Z')

testMatrix.setupTestSuite(
  () => {
    beforeAll(async () => {
      await prisma.testModel.createMany({
        data: [
          {
            id: 'values',
            integer: 2147483647,
            number: '123456789.1234',
            double: 12.5,
            text: 'KES 测试',
            bytes: Buffer.from([0, 127, 255]),
            json: { hello: ['world', 1] },
            dateTime,
            boolean: true,
            uuid: '123e4567-e89b-12d3-a456-426614174000',
            role: 'ADMIN',
          },
          { id: 'nulls' },
        ],
      })
    })
    test('Typed SQL reads native scalar values', async () => {
      const [row] = await prisma.$queryRawTyped(sql.findScalars('values'))
      expect(row.integer).toBe(2147483647)
      expect(row.number).toEqual(new Prisma.Decimal('123456789.1234'))
      expect(row.double).toBe(12.5)
      expect(row.text).toBe('KES 测试')
      expect(row.bytes).toEqual(Buffer.from([0, 127, 255]))
      expect(row.json).toEqual({ hello: ['world', 1] })
      expect(row.dateTime).toEqual(dateTime)
      expect(row.boolean).toBe(true)
      expect(row.uuid).toBe('123e4567-e89b-12d3-a456-426614174000')
      expect(row.role).toBe('ADMIN')
    })
    test('Typed SQL preserves SQL NULL for every scalar', async () => {
      const [row] = await prisma.$queryRawTyped(sql.findScalars('nulls'))
      expect(Object.values(row)).toEqual(Array(10).fill(null))
    })
    test('Typed SQL binds NUMBER as Decimal', async () => {
      const rows = await prisma.$queryRawTyped(sql.findNumber(new Prisma.Decimal('123456789.1234')))
      expect(rows).toEqual([{ id: 'values' }])
    })
  },
  {
    optOut: {
      from: ['mysql', 'postgresql', 'sqlite', 'sqlserver', 'mongodb', 'cockroachdb', 'kingbase-mysql'],
      reason: 'KES Oracle native scalar and Typed SQL coverage',
    },
  },
)
