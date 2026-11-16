import { runtimeIntegrationTest } from '../../__helpers__/integrationTest'
import { hasKingbaseConnection } from '../../__helpers__/kingbaseDatabase'
import { database } from './__database'
import { scenarios } from './__scenarios'

if (hasKingbaseConnection('kingbase-oracle')) {
  runtimeIntegrationTest({ database, scenarios })
} else {
  describe('Kingbase Oracle runtime integration tests', () => {
    test.skip('requires TEST_KINGBASE_ORACLE_URI or TEST_FUNCTIONAL_KINGBASE_ORACLE_URI', () => {})
  })
}
