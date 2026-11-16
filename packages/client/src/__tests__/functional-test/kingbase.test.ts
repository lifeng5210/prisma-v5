import { scopeKingbaseSchema } from '../../../tests/functional/_utils/kingbase'

const source = `datasource db {
  provider = "kingbase-oracle"
  schemas = ["base", "transactional"]
}
model User {
  id Int @id
  @@schema("base")
}
model Order {
  id Int @id
  @@schema("transactional")
}`

test('KES functional multi-schema fixtures use only this test namespace', () => {
  const schema = scopeKingbaseSchema(source, 'kingbase-oracle://localhost/db?schema=kes_v5_unique', 'kingbase-oracle')
  expect(schema).toContain('schemas = ["kes_v5_unique_base","kes_v5_unique_transactional"]')
  expect(schema).toContain('@@schema("kes_v5_unique_base")')
  expect(schema).toContain('@@schema("kes_v5_unique_transactional")')
})

test.each(['public', 'existing_schema', 'kes_v5_PRISMA_DB_NAME', 'kes_v5_bad%22name'])(
  'KES rejects an unscoped or unresolved schema: %s',
  (schema) => {
    expect(() =>
      scopeKingbaseSchema(source, `kingbase-oracle://localhost/db?schema=${schema}`, 'kingbase-oracle'),
    ).toThrow('unique schema')
  },
)

test('existing providers retain their schema declarations', () => {
  expect(scopeKingbaseSchema(source, 'postgresql://localhost/db?schema=public', 'postgresql')).toBe(source)
})

test('KES multi-schema fixture names fit the database identifier limit', () => {
  expect(() =>
    scopeKingbaseSchema(
      source.replaceAll('transactional', 'transactional_schema'),
      `kingbase-oracle://localhost/db?schema=kes_v5_${'x'.repeat(41)}`,
      'kingbase-oracle',
    ),
  ).toThrow('63 characters')
})
