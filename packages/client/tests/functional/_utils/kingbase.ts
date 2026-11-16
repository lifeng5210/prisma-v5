import { SchemaEngine } from '@prisma/migrate'
import fs from 'fs/promises'

import { Providers } from './providers'

export function isKingbaseProvider(provider: string): boolean {
  return provider === Providers.KINGBASE_MYSQL || provider === Providers.KINGBASE_ORACLE
}

function testSchema(databaseUrl: string): string {
  const schema = new URL(databaseUrl).searchParams.get('schema')
  if (!schema || !/^kes_v5_[a-zA-Z0-9_-]+$/.test(schema) || schema.length > 48 || schema.includes('PRISMA_DB_NAME')) {
    throw new Error('KES functional test URLs must select a unique schema prefixed with kes_v5_')
  }
  return schema
}

export function scopeKingbaseSchema(schema: string, databaseUrl: string, provider: string): string {
  if (!isKingbaseProvider(provider)) return schema
  const prefix = testSchema(databaseUrl)
  const names = new Map<string, string>()
  schema = schema.replace(/(schemas\s*=\s*)(\[[^\]]*\])/g, (_match, declaration, list) => {
    const scoped = (JSON.parse(list) as string[]).map((name) => {
      const value = `${prefix}_${name}`
      if (value.length > 63) throw new Error('KES test schema name exceeds 63 characters')
      names.set(name, value)
      return value
    })
    return declaration + JSON.stringify(scoped)
  })
  return schema.replace(/(@@schema\(\s*)("[^"]+")(\s*\))/g, (match, start, name, end) => {
    const scoped = names.get(JSON.parse(name))
    return scoped ? start + JSON.stringify(scoped) + end : match
  })
}

async function schemaNames(databaseUrl: string, schemaPath: string): Promise<string[]> {
  const prefix = testSchema(databaseUrl)
  const schema = await fs.readFile(schemaPath, 'utf8').catch((error) => {
    if (error.code === 'ENOENT') return ''
    throw error
  })
  const match = schema.match(/schemas\s*=\s*(\[[^\]]*\])/)
  const names = match ? (JSON.parse(match[1]) as string[]) : []
  if (names.some((name) => !name.startsWith(`${prefix}_`) || !/^kes_v5_[a-zA-Z0-9_-]+$/.test(name))) {
    throw new Error('Refusing to modify a schema outside this KES test scope')
  }
  return [...new Set([prefix, ...names])]
}

async function manageSchemas(databaseUrl: string, schemaPath: string, create: boolean): Promise<void> {
  const names = await schemaNames(databaseUrl, schemaPath)
  const adminUrl = new URL(databaseUrl)
  adminUrl.searchParams.delete('schema')
  const engine = new SchemaEngine({})
  try {
    for (const name of names) {
      await engine.dbExecute({
        datasourceType: { tag: 'url', url: adminUrl.toString() },
        script: `DROP SCHEMA IF EXISTS "${name}" CASCADE${create ? `; CREATE SCHEMA "${name}"` : ''}`,
      })
    }
  } finally {
    engine.stop()
  }
}

export const resetKingbaseSchemas = (url: string, schemaPath: string) => manageSchemas(url, schemaPath, true)
export const dropKingbaseSchemas = (url: string, schemaPath: string) => manageSchemas(url, schemaPath, false)
