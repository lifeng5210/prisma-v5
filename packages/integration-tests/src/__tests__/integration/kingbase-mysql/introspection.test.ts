import { introspectionIntegrationTest } from '../../__helpers__/integrationTest'
import { hasKingbaseConnection } from '../../__helpers__/kingbaseDatabase'
import { database } from './__database'
import { scenarios } from './__scenarios'

if (hasKingbaseConnection('kingbase-mysql')) {
  introspectionIntegrationTest({ database, scenarios })
} else {
  describe('Kingbase Mysql introspection integration tests', () => {
    test.skip('requires TEST_KINGBASE_MYSQL_URI or TEST_FUNCTIONAL_KINGBASE_MYSQL_URI', () => {})
  })
}
