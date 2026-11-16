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
    tiny Int? @db.TinyInt
    float Float? @db.Float(24)
    char String? @db.Char(4)
    varchar String? @db.VarChar2(32)
    nchar String? @db.NChar(4)
    nvarchar String? @db.NVarChar2(32)
    date DateTime? @db.Date
    timestamp DateTime? @db.Timestamp(3)
    timestampTz DateTime? @db.TimestampTz(3)
    timestampLocalTz DateTime? @db.TimestampLocalTz(3)
    boolean Boolean? @db.Boolean
    json Json? @db.Json
    uuid String? @db.Uuid
    xml String? @db.Xml
    binaryInteger Int? @db.BinaryInteger
    charByte String? @db.CharByte(12)
    varcharByte String? @db.VarChar2Byte(24)
    rowId String? @db.RowId
    urowId String? @db.URowId(128)
    number Decimal? @db.Number(30, 10)
    decimalAlias Decimal? @db.Decimal(30, 10)
    binaryFloat Float? @db.BinaryFloat
    binaryDouble Float? @db.BinaryDouble
    clob String? @db.Clob
    nclob String? @db.NClob
    blob Bytes? @db.Blob
  }
`,
)
