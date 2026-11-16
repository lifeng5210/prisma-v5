import testMatrix from '../_matrix'

export default testMatrix.setupSchema(
  ({ provider }) => `
  generator client {
    provider = "prisma-client-js"
  }
  datasource db {
    provider = "${provider}"
    url = env("DATABASE_URI_${provider}")
  }
  model NativeTypes {
    id Int @id
    unsignedInteger Int? @db.UnsignedInt
    date DateTime? @db.Date
    time DateTime? @db.Time(3)
    dateTime DateTime? @db.DateTime(3)
    timestamp DateTime? @db.Timestamp(3)
    year Int? @db.Year
    tiny Int? @db.TinyInt
    unsignedTiny Int? @db.UnsignedTinyInt
    small Int? @db.SmallInt
    unsignedSmall Int? @db.UnsignedSmallInt
    medium Int? @db.MediumInt
    unsignedMedium Int? @db.UnsignedMediumInt
    integer Int? @db.Int
    big BigInt? @db.BigInt
    unsignedBig BigInt? @db.UnsignedBigInt
    decimal Decimal? @db.Decimal(40, 10)
    float Float? @db.Float
    double Float? @db.Double
    bitBoolean Boolean? @db.Bit(1)
    bitBytes Bytes? @db.Bit(8)
    fixed Bytes? @db.Binary(4)
    variable Bytes? @db.VarBinary(32)
    tinyBlob Bytes? @db.TinyBlob
    blob Bytes? @db.Blob
    mediumBlob Bytes? @db.MediumBlob
    longBlob Bytes? @db.LongBlob
    char String? @db.Char(4)
    varchar String? @db.VarChar(32)
    tinyText String? @db.TinyText
    text String? @db.Text
    mediumText String? @db.MediumText
    longText String? @db.LongText
    json Json?
  }
`,
)
