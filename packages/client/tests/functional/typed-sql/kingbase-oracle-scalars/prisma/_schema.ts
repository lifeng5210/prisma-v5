import testMatrix from '../_matrix'

export default testMatrix.setupSchema(
  ({ provider }) => `
  generator client {
    provider = "prisma-client-js"
    previewFeatures = ["typedSql"]
  }
  datasource db {
    provider = "${provider}"
    url = env("DATABASE_URI_${provider}")
  }
  model TestModel {
    id String @id
    integer Int? @db.BinaryInteger
    number Decimal? @db.Number(20, 4)
    double Float? @db.BinaryDouble
    text String? @db.VarChar2(64)
    bytes Bytes? @db.Blob
    json Json?
    dateTime DateTime? @db.Timestamp(3)
    boolean Boolean?
    uuid String? @db.Uuid
    role Role?
  }
  enum Role {
    ADMIN
    USER
  }
`,
)
