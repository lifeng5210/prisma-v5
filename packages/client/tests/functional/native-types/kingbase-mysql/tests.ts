import testMatrix from './_matrix'
// @ts-ignore
import type { Prisma as PrismaNamespace, PrismaClient } from './node_modules/@prisma/client'

declare let prisma: PrismaClient
declare let Prisma: typeof PrismaNamespace

testMatrix.setupTestSuite(
  () => {
    test.each([
      {
        id: 1,
        tiny: -128,
        unsignedTiny: 0,
        small: -32768,
        unsignedSmall: 0,
        medium: -8388608,
        unsignedMedium: 0,
        integer: -2147483648,
        big: -9223372036854775808n,
        unsignedBig: 0n,
      },
      {
        id: 2,
        tiny: 127,
        unsignedTiny: 255,
        small: 32767,
        unsignedSmall: 65535,
        medium: 8388607,
        unsignedMedium: 16777215,
        integer: 2147483647,
        big: 9223372036854775807n,
        unsignedBig: 9223372036854775807n,
      },
    ])('integer boundaries round trip: $id', async (data) => {
      expect(await prisma.nativeTypes.create({ data })).toMatchObject(data)
      expect(await prisma.nativeTypes.findUniqueOrThrow({ where: { id: data.id } })).toMatchObject(data)
    })
    test.each([false, true])('BIT boolean and bytes round trip: %s', async (value) => {
      const id = value ? 4 : 3
      const bytes = Buffer.from([value ? 255 : 0])
      const row = await prisma.nativeTypes.create({ data: { id, bitBoolean: value, bitBytes: bytes } })
      expect(row.bitBoolean).toBe(value)
      expect(row.bitBytes).toEqual(bytes)
      expect(await prisma.nativeTypes.findMany({ where: { id, bitBoolean: value } })).toHaveLength(1)
    })
    test('BIT filters distinguish boolean and byte values before and after updates', async () => {
      const select = { id: true, bitBoolean: true, bitBytes: true }
      const idFilter = { in: [100, 101, 102, 103] }
      for (const [id, bitBoolean, byte] of [
        [100, false, 0],
        [101, true, 1],
        [102, true, 170],
        [103, false, 255],
      ] as const) {
        await prisma.nativeTypes.create({ data: { id, bitBoolean, bitBytes: Buffer.from([byte]) } })
      }
      for (const [value, ids] of [
        [false, [100, 103]],
        [true, [101, 102]],
      ] as const) {
        const rows = await prisma.nativeTypes.findMany({
          where: { id: idFilter, bitBoolean: value },
          orderBy: { id: 'asc' },
          select,
        })
        expect(rows.map((row) => row.id)).toEqual(ids)
      }
      for (const [byte, id] of [
        [0, 100],
        [1, 101],
        [170, 102],
        [255, 103],
      ]) {
        expect(
          await prisma.nativeTypes.findMany({
            where: { id: idFilter, bitBytes: Buffer.from([byte]) },
            select: { id: true },
          }),
        ).toEqual([{ id }])
      }
      expect(
        await prisma.nativeTypes.findMany({
          where: { id: idFilter, bitBytes: { in: [Buffer.from([0]), Buffer.from([255])] } },
          orderBy: { id: 'asc' },
          select: { id: true },
        }),
      ).toEqual([{ id: 100 }, { id: 103 }])
      expect(
        await prisma.nativeTypes.updateMany({
          where: { id: idFilter, bitBoolean: false, bitBytes: Buffer.from([0]) },
          data: { bitBoolean: true, bitBytes: Buffer.from([85]) },
        }),
      ).toEqual({ count: 1 })
      expect(
        await prisma.nativeTypes.findMany({
          where: { id: idFilter, bitBoolean: true, bitBytes: Buffer.from([85]) },
          select: { id: true },
        }),
      ).toEqual([{ id: 100 }])
    })
    test('DECIMAL and floating types preserve values', async () => {
      const decimal = new Prisma.Decimal('123456789012345678901234567890.1234567890')
      const row = await prisma.nativeTypes.create({ data: { id: 5, decimal, float: 1.5, double: -12.5 } })
      expect(row).toMatchObject({ decimal, float: 1.5, double: -12.5 })
    })
    test('binary and blob families preserve all byte values', async () => {
      const bytes = Buffer.from([0, 127, 128, 255])
      const data = {
        id: 6,
        fixed: bytes,
        variable: bytes,
        tinyBlob: bytes,
        blob: bytes,
        mediumBlob: bytes,
        longBlob: bytes,
      }
      expect(await prisma.nativeTypes.create({ data })).toMatchObject(data)
    })
    test('character, text and JSON families preserve multibyte values', async () => {
      const text = '金仓KES'
      const data = {
        id: 7,
        char: 'ABCD',
        varchar: text,
        tinyText: text,
        text,
        mediumText: text,
        longText: text,
        json: { hello: [1, true, null] },
      }
      expect(await prisma.nativeTypes.create({ data })).toMatchObject(data)
    })
    test('MySQL date and time native types round trip', async () => {
      const date = new Date('2024-07-31T00:00:00.000Z')
      const time = new Date('1970-01-01T14:37:36.570Z')
      const dateTime = new Date('2024-07-31T14:37:36.570Z')
      const data = { id: 9, unsignedInteger: 2147483647, date, time, dateTime, timestamp: dateTime, year: 2024 }
      expect(await prisma.nativeTypes.create({ data })).toMatchObject(data)
      expect(await prisma.nativeTypes.findUniqueOrThrow({ where: { id: 9 } })).toMatchObject(data)
    })
    test('nullable native types preserve NULL', async () => {
      const { id, ...values } = await prisma.nativeTypes.create({ data: { id: 8 } })
      expect(id).toBe(8)
      expect(Object.values(values)).toEqual(Array(33).fill(null))
    })
  },
  {
    optOut: {
      from: ['mysql', 'postgresql', 'sqlite', 'sqlserver', 'mongodb', 'cockroachdb', 'kingbase-oracle'],
      reason: 'KES MySQL native types and boundary values',
    },
  },
)
