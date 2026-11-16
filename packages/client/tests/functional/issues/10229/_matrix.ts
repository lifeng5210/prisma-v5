import { defineMatrix } from '../../_utils/defineMatrix'
import { Providers } from '../../_utils/providers'

export default defineMatrix(() => [
  [
    {
      provider: Providers.POSTGRESQL,
      url: 'postgresql://invalid:invalid@invalid.org:123/invalid',
    },
    {
      provider: Providers.KINGBASE_ORACLE,
      // A closed local port makes the initialization-error fixture independent of external DNS.
      url: 'kingbase-oracle://invalid:invalid@127.0.0.1:1/invalid?connect_timeout=1',
    },
    {
      provider: Providers.MYSQL,
      url: 'mysql://invalid:invalid@invalid:3307/invalid',
    },
    {
      provider: Providers.KINGBASE_MYSQL,
      url: 'kingbase-mysql://invalid:invalid@127.0.0.1:1/invalid?connect_timeout=1',
    },
    {
      provider: Providers.COCKROACHDB,
      url: 'postgresql://invalid:invalid@invalid.org:123/invalid',
    },
  ],
])
