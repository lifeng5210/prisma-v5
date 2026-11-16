import { idForProvider } from '../../../_utils/idForProvider'
import { Providers } from '../../../_utils/providers'
import testMatrix from '../_matrix'

export default testMatrix.setupSchema(({ provider }) => {
  // Oracle DATE includes the time of day; it has no standalone TIME native type.
  const timeNativeType = provider === Providers.KINGBASE_ORACLE ? 'Date' : 'Time'
  const compatibleTypes =
    provider !== Providers.SQLITE
      ? `
          date DateTime @db.Date 
          time DateTime @db.${timeNativeType}
        `
      : ''

  return /* Prisma */ `
    generator client {
      provider = "prisma-client-js"
    }
    
    datasource db {
      provider = "${provider}"
      url      = env("DATABASE_URI_${provider}")
    }
    
    model User {
      id ${idForProvider(provider)}
      dateTime DateTime
      uuid String @default(uuid())
      ${compatibleTypes}
    }
  `
})
