import testMatrix from './_matrix'
// @ts-ignore
import type { Prisma as PrismaNamespace, PrismaClient } from './node_modules/@prisma/client'

declare let prisma: PrismaClient
declare let Prisma: typeof PrismaNamespace

testMatrix.setupTestSuite(
  () => {
    test.each([-2147483648, 0, 2147483647])('BINARY_INTEGER round trip: %s', async (value) => {
      const row = await prisma.nativeTypes.create({ data: { id: value, binaryInteger: value } })
      expect(row.binaryInteger).toBe(value)
      expect((await prisma.nativeTypes.findUniqueOrThrow({ where: { id: value } })).binaryInteger).toBe(value)
    })
    test('byte length character types preserve ASCII and multibyte text', async () => {
      const row = await prisma.nativeTypes.create({ data: { id: 1, charByte: 'abcdefghijkl', varcharByte: '金仓KES' } })
      expect(row.charByte).toBe('abcdefghijkl')
      expect(row.varcharByte).toBe('金仓KES')
    })
    test('ROWID and UROWID bind and read an actual row identifier', async () => {
      await prisma.nativeTypes.create({ data: { id: 2 } })
      const [source] = await prisma.$queryRaw<{ rid: string }[]>`SELECT nextrowid() AS "rid"`
      const row = await prisma.nativeTypes.update({ where: { id: 2 }, data: { rowId: source.rid, urowId: source.rid } })
      expect(row.rowId).toBe(source.rid)
      expect(row.urowId).toBe(source.rid)
      expect(await prisma.nativeTypes.findMany({ where: { rowId: source.rid, urowId: source.rid } })).toHaveLength(1)
    })
    test('NUMBER and DECIMAL preserve precision', async () => {
      const value = new Prisma.Decimal('12345678901234567890.1234567890')
      const row = await prisma.nativeTypes.create({ data: { id: 3, number: value, decimalAlias: value } })
      expect(row.number).toEqual(value)
      expect(row.decimalAlias).toEqual(value)
    })
    test('binary floating types and LOB values round trip', async () => {
      const text = '金仓KES'.repeat(1000)
      const bytes = Buffer.from([0, 1, 127, 128, 255])
      const row = await prisma.nativeTypes.create({
        data: { id: 4, binaryFloat: 1.5, binaryDouble: -12.5, clob: text, nclob: text, blob: bytes },
      })
      expect(row).toMatchObject({ binaryFloat: 1.5, binaryDouble: -12.5, clob: text, nclob: text, blob: bytes })
    })
    test('Oracle character, date, timestamp, XML and JSON types round trip', async () => {
      const date = new Date('2024-07-31T14:37:36.000Z')
      const timestamp = new Date('2024-07-31T14:37:36.570Z')
      const data = {
        id: 6,
        tiny: 1,
        float: 1.5,
        char: 'ABCD',
        varchar: '金仓KES',
        nchar: 'ABCD',
        nvarchar: '金仓KES',
        date,
        timestamp,
        timestampTz: timestamp,
        timestampLocalTz: timestamp,
        boolean: true,
        json: { hello: [1, true, null] },
        uuid: '123e4567-e89b-12d3-a456-426614174000',
        xml: '<hello>world</hello>',
      }
      expect(await prisma.nativeTypes.create({ data })).toMatchObject(data)
      expect(await prisma.nativeTypes.findUniqueOrThrow({ where: { id: 6 } })).toMatchObject(data)
    })
    test('nullable native types preserve NULL', async () => {
      const { id, ...values } = await prisma.nativeTypes.create({ data: { id: 5 } })
      expect(id).toBe(5)
      expect(Object.values(values)).toEqual(Array(26).fill(null))
    })
  },
  {
    optOut: {
      from: ['mysql', 'postgresql', 'sqlite', 'sqlserver', 'mongodb', 'cockroachdb', 'kingbase-mysql'],
      reason: 'KES Oracle native types',
    },
  },
)
