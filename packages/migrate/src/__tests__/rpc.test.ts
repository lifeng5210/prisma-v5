import { jestConsoleContext, jestContext } from '@prisma/get-platform'
import { getSchema, getSchemaWithPath, MultipleSchemas, toSchemasContainer } from '@prisma/internals'
import fs from 'fs-jetpack'
import path from 'path'

import { Migrate } from '../Migrate'
import { SchemaEngine } from '../SchemaEngine'
import { introspectSql } from '../utils/introspectSql'

const ctx = jestContext.new().add(jestConsoleContext()).assemble()

describe('applyMigrations', () => {
  it('should succeed', async () => {
    ctx.fixture('existing-db-1-migration')
    const { schemaPath } = (await getSchemaWithPath())!
    const migrate = new Migrate(schemaPath)
    const result = migrate.engine.applyMigrations({
      migrationsDirectoryPath: migrate.migrationsDirectoryPath!,
    })

    await expect(result).resolves.toMatchInlineSnapshot(`
      {
        "appliedMigrationNames": [],
      }
    `)
    migrate.stop()
  })

  it('should fail on existing brownfield db', async () => {
    ctx.fixture('existing-db-brownfield')
    const { schemaPath } = (await getSchemaWithPath())!
    const migrate = new Migrate(schemaPath)
    const result = migrate.engine.applyMigrations({
      migrationsDirectoryPath: migrate.migrationsDirectoryPath!,
    })

    await expect(result).rejects.toMatchInlineSnapshot(`
      "P3005

      The database schema is not empty. Read more about how to baseline an existing production database: https://pris.ly/d/migrate-baseline
      "
    `)
    migrate.stop()
  })
})

describe('createDatabase', () => {
  it('should succeed - ConnectionString - sqlite', async () => {
    ctx.fixture('schema-only-sqlite')
    const migrate = new Migrate()
    const result = migrate.engine.createDatabase({
      datasource: {
        tag: 'ConnectionString',
        url: 'file:dev.db',
      },
    })

    await expect(result).resolves.toMatchInlineSnapshot(`
      {
        "databaseName": "dev.db",
      }
    `)
    migrate.stop()
  })

  it('should succeed - Schema - postgresql', async () => {
    ctx.fixture('schema-only')
    const schemas = await getSchema()
    const migrate = new Migrate()
    const result = migrate.engine.createDatabase({
      datasource: {
        tag: 'Schema',
        ...toSchemasContainer(schemas),
      },
    })

    await expect(result).rejects.toMatchInlineSnapshot(`
      "P1009

      Database \`tests\` already exists on the database server at \`localhost:5432\`
      "
    `)
    migrate.stop()
  })
})

describe('createMigration', () => {
  it('should succeed - existing-db-1-migration', async () => {
    ctx.fixture('schema-only-sqlite')
    const { schemaPath, schemas } = (await getSchemaWithPath())!
    const migrate = new Migrate(schemaPath)
    const result = migrate.engine.createMigration({
      migrationsDirectoryPath: migrate.migrationsDirectoryPath!,
      migrationName: 'my_migration',
      draft: false,
      schema: toSchemasContainer(schemas),
    })

    await expect(result).resolves.toMatchInlineSnapshot(`
      {
        "generatedMigrationName": "20201231000000_my_migration",
      }
    `)
    migrate.stop()
  })

  it('draft should succeed - existing-db-1-migration', async () => {
    ctx.fixture('existing-db-1-migration')
    const { schemaPath, schemas } = (await getSchemaWithPath())!
    const migrate = new Migrate(schemaPath)
    const result = migrate.engine.createMigration({
      migrationsDirectoryPath: migrate.migrationsDirectoryPath!,
      migrationName: 'draft_123',
      draft: true,
      schema: toSchemasContainer(schemas),
    })

    await expect(result).resolves.toMatchInlineSnapshot(`
      {
        "generatedMigrationName": "20201231000000_draft_123",
      }
    `)
    migrate.stop()
  })
})

describe('dbExecute', () => {
  it('should succeed - sqlite', async () => {
    ctx.fixture('schema-only-sqlite')
    const migrate = new Migrate()
    const result = migrate.engine.dbExecute({
      datasourceType: {
        tag: 'url',
        url: 'file:dev.db',
      },
      script: `-- CreateTable
      SELECT 1
      `,
    })

    await expect(result).resolves.toMatchInlineSnapshot(`null`)
    migrate.stop()
  })
})

describe('devDiagnostic', () => {
  it('createMigration', async () => {
    ctx.fixture('schema-only-sqlite')
    const { schemaPath } = (await getSchemaWithPath())!
    const migrate = new Migrate(schemaPath)
    const result = migrate.engine.devDiagnostic({
      migrationsDirectoryPath: migrate.migrationsDirectoryPath!,
    })
    await expect(result).resolves.toMatchInlineSnapshot(`
      {
        "action": {
          "tag": "createMigration",
        },
      }
    `)

    migrate.stop()
  })

  it('reset because drift', async () => {
    ctx.fixture('existing-db-1-migration-conflict')
    const { schemaPath } = (await getSchemaWithPath())!
    const migrate = new Migrate(schemaPath)
    const result = migrate.engine.devDiagnostic({
      migrationsDirectoryPath: migrate.migrationsDirectoryPath!,
    })
    await expect(result).resolves.toMatchInlineSnapshot(`
      {
        "action": {
          "reason": "Drift detected: Your database schema is not in sync with your migration history.

      The following is a summary of the differences between the expected database schema given your migrations files, and the actual schema of the database.

      It should be understood as the set of changes to get from the expected schema to the actual schema.

      If you are running this the first time on an existing database, please make sure to read this documentation page:
      https://www.prisma.io/docs/guides/database/developing-with-prisma-migrate/troubleshooting-development

      [+] Added tables
        - Blog
        - _Migration
      ",
          "tag": "reset",
        },
      }
    `)

    migrate.stop()
  })
})

describe('diagnoseMigrationHistory', () => {
  it('optInToShadowDatabase true should succeed - existing-db-1-migration', async () => {
    ctx.fixture('existing-db-1-migration')
    const { schemaPath } = (await getSchemaWithPath())!
    const migrate = new Migrate(schemaPath)
    const result = migrate.engine.diagnoseMigrationHistory({
      migrationsDirectoryPath: migrate.migrationsDirectoryPath!,
      optInToShadowDatabase: true,
    })

    await expect(result).resolves.toMatchInlineSnapshot(`
      {
        "editedMigrationNames": [],
        "failedMigrationNames": [],
        "hasMigrationsTable": true,
        "history": null,
      }
    `)
    migrate.stop()
  })

  it(' optInToShadowDatabase false should succeed - existing-db-1-migration', async () => {
    ctx.fixture('existing-db-1-migration')
    const { schemaPath } = (await getSchemaWithPath())!
    const migrate = new Migrate(schemaPath)
    const result = migrate.engine.diagnoseMigrationHistory({
      migrationsDirectoryPath: migrate.migrationsDirectoryPath!,
      optInToShadowDatabase: false,
    })

    await expect(result).resolves.toMatchInlineSnapshot(`
      {
        "editedMigrationNames": [],
        "failedMigrationNames": [],
        "hasMigrationsTable": true,
        "history": null,
      }
    `)
    migrate.stop()
  })
})

describe('ensureConnectionValidity', () => {
  it('should succeed when database exists - SQLite', async () => {
    ctx.fixture('schema-only-sqlite')
    ctx.fs.write('dev.db', '')
    const migrate = new Migrate()
    const result = migrate.engine.ensureConnectionValidity({
      datasource: {
        tag: 'ConnectionString',
        url: 'file:dev.db',
      },
    })

    await expect(result).resolves.toMatchInlineSnapshot(`{}`)
    migrate.stop()
  })

  it('should succeed when database exists - PostgreSQL', async () => {
    ctx.fixture('schema-only')
    const { schemaPath, schemas } = (await getSchemaWithPath())!
    const migrate = new Migrate(schemaPath)
    const result = migrate.engine.ensureConnectionValidity({
      datasource: {
        tag: 'Schema',
        ...toSchemasContainer(schemas),
      },
    })

    await expect(result).resolves.toMatchInlineSnapshot(`{}`)
    migrate.stop()
  })

  it('should fail when database does not exist - SQLite', async () => {
    ctx.fixture('schema-only-sqlite')
    const migrate = new Migrate()
    const result = migrate.engine.ensureConnectionValidity({
      datasource: {
        tag: 'ConnectionString',
        url: 'file:dev.db',
      },
    })

    await expect(result).rejects.toMatchInlineSnapshot(`
      "P1003

      Database \`dev.db\` does not exist at \`dev.db\`.
      "
    `)
    migrate.stop()
  })

  it('should fail when server does not exist - PostgreSQL', async () => {
    ctx.fixture('schema-only-sqlite')
    const migrate = new Migrate()
    const result = migrate.engine.ensureConnectionValidity({
      datasource: {
        tag: 'ConnectionString',
        url: 'postgresql://server-does-not-exist:5432/db-does-not-exist',
      },
    })

    await expect(result).rejects.toMatchInlineSnapshot(`
      "P1001

      Can't reach database server at \`server-does-not-exist:5432\`

      Please make sure your database server is running at \`server-does-not-exist:5432\`.
      "
    `)
    migrate.stop()
    // It was flaky on CI (but rare)
    // higher timeout might help
  }, 10_000)
})

describe('evaluateDataLoss', () => {
  // migration is not yet applied
  it('should succeed - schema-only-sqlite', async () => {
    ctx.fixture('schema-only-sqlite')
    const { schemaPath, schemas } = (await getSchemaWithPath())!
    const migrate = new Migrate(schemaPath)
    const result = migrate.engine.evaluateDataLoss({
      migrationsDirectoryPath: migrate.migrationsDirectoryPath!,
      schema: toSchemasContainer(schemas),
    })

    await expect(result).resolves.toMatchInlineSnapshot(`
      {
        "migrationSteps": 1,
        "unexecutableSteps": [],
        "warnings": [],
      }
    `)
    migrate.stop()
  })

  // migration is already applied so should be empty
  it('should succeed - existing-db-1-migration', async () => {
    ctx.fixture('existing-db-1-migration')
    const { schemaPath, schemas } = (await getSchemaWithPath())!
    const migrate = new Migrate(schemaPath)
    const result = migrate.engine.evaluateDataLoss({
      migrationsDirectoryPath: migrate.migrationsDirectoryPath!,
      schema: toSchemasContainer(schemas),
    })

    await expect(result).resolves.toMatchInlineSnapshot(`
      {
        "migrationSteps": 0,
        "unexecutableSteps": [],
        "warnings": [],
      }
    `)
    migrate.stop()
  })
})

describe('getDatabaseVersion - PostgreSQL', () => {
  it('[No params] should succeed', async () => {
    ctx.fixture('schema-only')
    const { schemaPath } = (await getSchemaWithPath())!
    const migrate = new Migrate(schemaPath)
    const result = migrate.engine.getDatabaseVersion()
    await expect(result).resolves.toContain('PostgreSQL')
    migrate.stop()
  })

  it('[SchemaPath] should succeed', async () => {
    ctx.fixture('schema-only')
    const { schemas } = (await getSchemaWithPath())!
    const migrate = new Migrate()
    const result = migrate.engine.getDatabaseVersion({
      datasource: {
        tag: 'Schema',
        ...toSchemasContainer(schemas),
      },
    })
    await expect(result).resolves.toContain('PostgreSQL')
    migrate.stop()
  })

  it('[ConnectionString] should succeed', async () => {
    const migrate = new Migrate()
    const result = migrate.engine.getDatabaseVersion({
      datasource: {
        tag: 'ConnectionString',
        url: process.env.TEST_POSTGRES_URI!,
      },
    })
    await expect(result).resolves.toContain('PostgreSQL')
    migrate.stop()
  })
})

describe('listMigrationDirectories', () => {
  it('should succeed - existing-db-1-migration', async () => {
    ctx.fixture('existing-db-1-migration')
    const { schemaPath } = (await getSchemaWithPath())!
    const migrate = new Migrate(schemaPath)
    const result = migrate.engine.listMigrationDirectories({
      migrationsDirectoryPath: migrate.migrationsDirectoryPath!,
    })
    await expect(result).resolves.toMatchInlineSnapshot(`
      {
        "migrations": [
          "20201231000000_init",
        ],
      }
    `)

    migrate.stop()
  })

  it('should succeed - schema-only-sqlite', async () => {
    ctx.fixture('schema-only-sqlite')
    const { schemaPath } = (await getSchemaWithPath())!
    const migrate = new Migrate(schemaPath)
    const result = migrate.engine.listMigrationDirectories({
      migrationsDirectoryPath: migrate.migrationsDirectoryPath!,
    })
    await expect(result).resolves.toMatchInlineSnapshot(`
      {
        "migrations": [],
      }
    `)

    migrate.stop()
  })
})

describe('markMigrationRolledBack', () => {
  it('should fail - existing-db-1-migration', async () => {
    jest.setTimeout(10_000)
    ctx.fixture('existing-db-1-migration')

    const { schemaPath } = (await getSchemaWithPath())!
    const migrate = new Migrate(schemaPath)

    const resultMarkRolledBacked = migrate.engine.markMigrationRolledBack({
      migrationName: '20201014154943_init',
    })

    await expect(resultMarkRolledBacked).rejects.toMatchInlineSnapshot(`
      "P3012

      Migration \`20201231000000_init\` cannot be rolled back because it is not in a failed state.
      "
    `)

    migrate.stop()
  })

  it('existing-db-1-migration', async () => {
    ctx.fixture('existing-db-1-migration')
    const { schemaPath, schemas } = (await getSchemaWithPath())!
    const migrate = new Migrate(schemaPath)
    const result = await migrate.engine.createMigration({
      migrationsDirectoryPath: migrate.migrationsDirectoryPath!,
      migrationName: 'draft_123',
      draft: true,
      schema: toSchemasContainer(schemas),
    })

    expect(result).toMatchInlineSnapshot(`
      {
        "generatedMigrationName": "20201231000000_draft_123",
      }
    `)

    fs.write(
      path.join(migrate.migrationsDirectoryPath!, result.generatedMigrationName!, 'migration.sql'),
      'SELECT SOMETHING_THAT_DOES_NOT_WORK',
    )

    try {
      await migrate.engine.applyMigrations({
        migrationsDirectoryPath: migrate.migrationsDirectoryPath!,
      })
    } catch (e) {
      expect(e.message).toContain('no such column: SOMETHING_THAT_DOES_NOT_WORK')
    }

    const resultMarkRolledBacked = migrate.engine.markMigrationRolledBack({
      migrationName: result.generatedMigrationName!,
    })

    await expect(resultMarkRolledBacked).resolves.toMatchSnapshot()

    const resultMarkAppliedFailed = migrate.engine.markMigrationApplied({
      migrationsDirectoryPath: migrate.migrationsDirectoryPath!,
      migrationName: result.generatedMigrationName!,
    })

    await expect(resultMarkAppliedFailed).resolves.toMatchSnapshot()

    const resultMarkApplied = migrate.engine.markMigrationApplied({
      migrationsDirectoryPath: migrate.migrationsDirectoryPath!,
      migrationName: result.generatedMigrationName!,
    })

    await expect(resultMarkApplied).rejects.toMatchInlineSnapshot(`
      "P3008

      The migration \`20201231000000_draft_123\` is already recorded as applied in the database.
      "
    `)

    migrate.stop()
  })
})

describe('markMigrationApplied', () => {
  it('existing-db-1-migration', async () => {
    ctx.fixture('existing-db-1-migration')
    const { schemaPath, schemas } = (await getSchemaWithPath())!
    const migrate = new Migrate(schemaPath)
    const result = await migrate.engine.createMigration({
      migrationsDirectoryPath: migrate.migrationsDirectoryPath!,
      migrationName: 'draft_123',
      draft: true,
      schema: toSchemasContainer(schemas),
    })

    expect(result).toMatchInlineSnapshot(`
      {
        "generatedMigrationName": "20201231000000_draft_123",
      }
    `)

    const resultMarkApplied = migrate.engine.markMigrationApplied({
      migrationsDirectoryPath: migrate.migrationsDirectoryPath!,
      migrationName: result.generatedMigrationName!,
    })

    await expect(resultMarkApplied).resolves.toMatchInlineSnapshot(`{}`)

    migrate.stop()
  })
})

describe('schemaPush', () => {
  // Note that the Prisma CLI creates the SQLite database file if it doesn't exist before calling the RPC
  // Since 5.0.0 this RPC does not error anymore if the SQLite database file is missing
  it('should succeed if SQLite database file is missing', async () => {
    ctx.fixture('schema-only-sqlite')
    const { schemaPath, schemas } = (await getSchemaWithPath())!
    const migrate = new Migrate(schemaPath)
    const result = migrate.engine.schemaPush({
      force: false,
      schema: toSchemasContainer(schemas),
    })

    await expect(result).resolves.toMatchInlineSnapshot(`
      {
        "executedSteps": 1,
        "unexecutable": [],
        "warnings": [],
      }
    `)
    migrate.stop()
  })

  it('should succeed without warning', async () => {
    ctx.fixture('existing-db-1-draft')
    const { schemaPath, schemas } = (await getSchemaWithPath())!
    const migrate = new Migrate(schemaPath)
    const result = migrate.engine.schemaPush({
      force: false,
      schema: toSchemasContainer(schemas),
    })

    await expect(result).resolves.toMatchInlineSnapshot(`
      {
        "executedSteps": 1,
        "unexecutable": [],
        "warnings": [],
      }
    `)
    migrate.stop()
  })

  it('should return executedSteps 0 with warning if dataloss detected', async () => {
    ctx.fixture('existing-db-brownfield')
    const { schemaPath, schemas } = (await getSchemaWithPath())!
    const migrate = new Migrate(schemaPath)

    const result = migrate.engine.schemaPush({
      force: false,
      schema: toSchemasContainer(replaceInSchemas(schemas, 'Blog', 'Something')),
    })

    await expect(result).resolves.toMatchInlineSnapshot(`
      {
        "executedSteps": 0,
        "unexecutable": [],
        "warnings": [
          "You are about to drop the \`Blog\` table, which is not empty (1 rows).",
        ],
      }
    `)
    migrate.stop()
  })

  it('force should accept dataloss', async () => {
    ctx.fixture('existing-db-brownfield')
    const { schemaPath, schemas } = (await getSchemaWithPath())!
    const migrate = new Migrate(schemaPath)

    const result = migrate.engine.schemaPush({
      force: true,
      schema: toSchemasContainer(replaceInSchemas(schemas, 'Blog', 'Something')),
    })

    await expect(result).resolves.toMatchInlineSnapshot(`
      {
        "executedSteps": 2,
        "unexecutable": [],
        "warnings": [
          "You are about to drop the \`Blog\` table, which is not empty (1 rows).",
        ],
      }
    `)
    migrate.stop()
  })
})

function replaceInSchemas(schemas: MultipleSchemas, search: string, replace: string): MultipleSchemas {
  return schemas.map(([path, content]) => [path, content.replace(search, replace)])
}

for (const [provider, envName] of [
  ['kingbase-mysql', 'TEST_KINGBASE_MYSQL_URI'],
  ['kingbase-oracle', 'TEST_KINGBASE_ORACLE_URI'],
] as const) {
  const describeIf = process.env[envName] ? describe : describe.skip

  describeIf(`${provider} migration RPC`, () => {
    it('migrates, introspects SQL and pushes changes in isolated schemas', async () => {
      ctx.fixture('empty')
      const schemaPath = ctx.fs.path('schema.prisma')
      const name = `v5_migrate_${process.pid}_${Date.now()}`
      const schemaNames = [name, `${name}_shadow`]
      const originalUrl = process.env.TEST_KINGBASE_MIGRATE_URI
      const originalShadowUrl = process.env.TEST_KINGBASE_MIGRATE_SHADOW_URI
      const url = new URL(process.env[envName]!)
      const bootstrap = new SchemaEngine({})
      const migrate = new Migrate(schemaPath)
      const execute = (script: string) =>
        bootstrap.dbExecute({ datasourceType: { tag: 'url', url: url.toString() }, script })

      try {
        for (const schema of schemaNames) {
          await execute(`CREATE SCHEMA "${schema}"`)
        }
        const scopedUrl = new URL(url)
        scopedUrl.searchParams.set('schema', name)
        process.env.TEST_KINGBASE_MIGRATE_URI = scopedUrl.toString()
        scopedUrl.searchParams.set('schema', `${name}_shadow`)
        process.env.TEST_KINGBASE_MIGRATE_SHADOW_URI = scopedUrl.toString()

        const datamodel = `datasource db {
  provider = "${provider}"
  url = env("TEST_KINGBASE_MIGRATE_URI")
  shadowDatabaseUrl = env("TEST_KINGBASE_MIGRATE_SHADOW_URI")
}

generator client {
  provider = "prisma-client-js"
  previewFeatures = ["typedSql"]
}

model MigrateRecord {
  id Int @id
  label String @unique @db.${provider === 'kingbase-mysql' ? 'VarChar' : 'VarChar2'}(64)
  amount Decimal @db.Decimal(20, 2)
}
`
        ctx.fs.write('schema.prisma', datamodel)
        const migration = await migrate.createMigration({
          migrationsDirectoryPath: migrate.migrationsDirectoryPath!,
          schema: toSchemasContainer(await getSchema(schemaPath)),
          migrationName: 'init',
          draft: false,
        })
        expect(migration.generatedMigrationName).toMatch(/_init$/)
        expect(ctx.fs.read(`migrations/${migration.generatedMigrationName}/migration.sql`)).toContain('MigrateRecord')
        expect(await migrate.applyMigrations()).toEqual({ appliedMigrationNames: [migration.generatedMigrationName] })
        expect(await migrate.applyMigrations()).toEqual({ appliedMigrationNames: [] })
        expect(await migrate.diagnoseMigrationHistory({ optInToShadowDatabase: false })).toMatchObject({
          history: null,
          failedMigrationNames: [],
          editedMigrationNames: [],
        })

        const table = provider === 'kingbase-mysql' ? '`MigrateRecord`' : '"MigrateRecord"'
        const placeholder = provider === 'kingbase-mysql' ? '?' : '$1'
        const query = `SELECT id FROM ${table} WHERE id = ${placeholder}`
        const typedSql = await introspectSql(schemaPath, [
          { name: 'findRecord', source: query, fileName: 'findRecord.sql' },
        ])
        expect(typedSql).toMatchObject({
          ok: true,
          queries: [{ name: 'findRecord', parameters: [expect.any(Object)], resultColumns: [{ name: 'id' }] }],
        })
        const invalidSql = await introspectSql(schemaPath, [
          { name: 'invalid', source: 'SELECT missing_column FROM ' + table, fileName: 'invalid.sql' },
        ])
        expect(invalidSql).toMatchObject({
          ok: false,
          errors: [{ fileName: 'invalid.sql', message: expect.any(String) }],
        })

        ctx.fs.write('schema.prisma', datamodel.replace('  id Int @id', '  id Int @id\n  optionalValue Int?'))
        const pushed = await migrate.push({})
        expect(pushed.executedSteps).toBeGreaterThan(0)
        expect(pushed).toMatchObject({ warnings: [], unexecutable: [] })
        expect(await migrate.push({})).toMatchObject({ executedSteps: 0, warnings: [], unexecutable: [] })
        const introspected = await migrate.engine.introspect({
          schema: toSchemasContainer(await getSchema(schemaPath)),
          baseDirectoryPath: ctx.fs.path(),
          force: true,
          compositeTypeDepth: -1,
        })
        const introspectedSchema = introspected.schema.files.map((file) => file.content).join('\n')
        expect(introspectedSchema).toMatch(new RegExp(`provider\\s*=\\s*"${provider}"`))
        expect(introspectedSchema).toContain('model MigrateRecord')
        expect(introspectedSchema).toMatch(/optionalValue\s+Int\?/)
        expect(introspectedSchema).toContain(provider === 'kingbase-mysql' ? '@db.Decimal(20, 2)' : '@db.Number(20, 2)')
      } finally {
        migrate.stop()
        try {
          for (const schema of schemaNames) {
            await execute(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`)
          }
        } finally {
          bootstrap.stop()
          if (originalUrl === undefined) delete process.env.TEST_KINGBASE_MIGRATE_URI
          else process.env.TEST_KINGBASE_MIGRATE_URI = originalUrl
          if (originalShadowUrl === undefined) delete process.env.TEST_KINGBASE_MIGRATE_SHADOW_URI
          else process.env.TEST_KINGBASE_MIGRATE_SHADOW_URI = originalShadowUrl
        }
      }
    }, 120_000)
  })
}
