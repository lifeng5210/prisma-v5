import * as PG from 'pg'

import type { Context, Input } from './integrationTest'

type KingbaseProvider = 'kingbase-mysql' | 'kingbase-oracle'
type Connection = { client: PG.Client; closed: boolean; schemaCreated: boolean; ctx: Context }

export function kingbaseSchemaName(ctx: Context): string {
  return `kes_v5_integration_${ctx.id}`
}

function connectionVariable(provider: KingbaseProvider): string {
  return provider === 'kingbase-mysql' ? 'TEST_KINGBASE_MYSQL_URI' : 'TEST_KINGBASE_ORACLE_URI'
}

function connectionString(provider: KingbaseProvider): string | undefined {
  const name = connectionVariable(provider)
  return process.env[name] || process.env[name.replace('TEST_', 'TEST_FUNCTIONAL_')]
}

export function hasKingbaseConnection(provider: KingbaseProvider): boolean {
  return Boolean(connectionString(provider))
}

/** Raw SQL setup uses the existing PostgreSQL wire-protocol client, not a Prisma driver adapter. */
export function createKingbaseDatabase(provider: KingbaseProvider): Input<Connection>['database'] {
  function datasourceUrl(ctx: Context): URL {
    const value = connectionString(provider)
    if (!value) throw new Error(`${connectionVariable(provider)} is not set`)
    const url = new URL(value)
    url.searchParams.set('schema', kingbaseSchemaName(ctx))
    url.searchParams.set('connection_limit', '1')
    return url
  }

  function rawClient(ctx: Context): PG.Client {
    const url = datasourceUrl(ctx)
    url.protocol = 'postgresql:'
    url.searchParams.delete('schema')
    url.searchParams.delete('connection_limit')
    return new PG.Client({ connectionString: url.toString(), connectionTimeoutMillis: 10_000 })
  }

  async function disconnect(db: Connection): Promise<void> {
    if (!db.closed) {
      db.closed = true
      await db.client.end()
    }
  }

  async function cleanup(db: Connection): Promise<void> {
    await disconnect(db)
    if (!db.schemaCreated) return
    const client = rawClient(db.ctx)
    try {
      await client.connect()
      await client.query(`DROP SCHEMA IF EXISTS "${kingbaseSchemaName(db.ctx)}" CASCADE`)
      db.schemaCreated = false
    } finally {
      await client.end()
    }
  }

  return {
    name: provider,
    datasource: {
      raw: (ctx) => `datasource db {
        provider = "${provider}"
        url = ${JSON.stringify(datasourceUrl(ctx).toString())}
      }`,
    },
    async connect(ctx) {
      const client = rawClient(ctx)
      try {
        await client.connect()
        return { client, closed: false, schemaCreated: false, ctx }
      } catch (error) {
        await client.end()
        throw error
      }
    },
    async beforeEach(db, sqlScenario, ctx) {
      try {
        // Only this suite's deterministic schema is reset; other test databases are untouched.
        await db.client.query(`
          DROP SCHEMA IF EXISTS "${kingbaseSchemaName(ctx)}" CASCADE;
          CREATE SCHEMA "${kingbaseSchemaName(ctx)}";
          SET search_path TO "${kingbaseSchemaName(ctx)}";
        `)
        db.schemaCreated = true
        await db.client.query(sqlScenario)
      } catch (error) {
        await cleanup(db)
        throw error
      } finally {
        await disconnect(db)
      }
    },
    afterEach: cleanup,
    close: cleanup,
  }
}
