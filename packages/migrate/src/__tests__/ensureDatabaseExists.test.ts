import { jestConsoleContext, jestContext } from '@prisma/get-platform'
import { getSchemaWithPath } from '@prisma/internals'

import { ensureDatabaseExists, getDatasourceInfo } from '../utils/ensureDatabaseExists'

const ctx = jestContext.new().add(jestConsoleContext()).assemble()

it('can create database - sqlite', async () => {
  ctx.fixture('schema-only-sqlite')
  const { schemaPath } = (await getSchemaWithPath())!
  const result = ensureDatabaseExists('create', schemaPath)
  await expect(result).resolves.toMatchInlineSnapshot(`"SQLite database dev.db created at file:dev.db"`)
})

it('can create database - sqlite - folder', async () => {
  ctx.fixture('schema-folder-sqlite')
  const { schemaPath } = (await getSchemaWithPath())!
  const result = ensureDatabaseExists('create', schemaPath)
  await expect(result).resolves.toMatchInlineSnapshot(`"SQLite database dev.db created at file:../dev.db"`)
})
//
// Would need logic to be reproducible for testing other databases
// createDatabase is already tested in the `@prisma/internals` tests
//

describe.each([
  ['kingbase-mysql', 'Kingbase MySQL'],
  ['kingbase-oracle', 'Kingbase Oracle'],
] as const)('%s datasource information', (provider, prettyProvider) => {
  test.each(['tenant', undefined])('preserves the selected schema %s', async (schema) => {
    ctx.fixture('empty')
    const url = `${provider}://user:password@localhost:54321/app${schema ? `?schema=${schema}` : ''}`
    ctx.fs.write(
      'schema.prisma',
      `datasource db {
  provider = "${provider}"
  url = "${url}"
}
`,
    )

    await expect(getDatasourceInfo({ schemaPath: ctx.fs.path('schema.prisma') })).resolves.toMatchObject({
      name: 'db',
      prettyProvider,
      dbName: 'app',
      dbLocation: 'localhost:54321',
      schema,
      url,
    })
  })
})
