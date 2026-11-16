import sql, { join } from 'sql-template-tag'

import { TypedSql } from '../types/exported/TypedSql'
import { rawQueryArgsMapper } from './rawQueryArgsMapper'

describe.each([
  ['mysql', 'SELECT ?, ?, ?'],
  ['sqlite', 'SELECT ?, ?, ?'],
  ['postgresql', 'SELECT $1, $2, $3'],
  ['kingbase-mysql', 'SELECT ?, ?, ?'],
  ['kingbase-oracle', 'SELECT $1, $2, $3'],
])('%s raw SQL arguments', (provider, expectedQuery) => {
  const mapper = rawQueryArgsMapper({ clientMethod: '$queryRaw', activeProvider: provider })

  test('keeps nested SQL parameter positions and values aligned', () => {
    const value = "O'Reilly ? $1"
    const result = mapper(sql`SELECT ${join([7, value, null], ', ')}`)

    expect(result.query).toBe(expectedQuery)
    expect(result.parameters).toEqual({
      values: JSON.stringify([7, value, null]),
      __prismaRawParameters__: true,
    })
  })

  test('preserves explicitly provided raw SQL and serializes parameters', () => {
    const result = mapper([expectedQuery, 7, 'value', null])

    expect(result.query).toBe(expectedQuery)
    expect(JSON.parse(result.parameters!.values)).toEqual([7, 'value', null])
  })

  test('preserves TypedSQL statements and values', () => {
    const result = mapper(new TypedSql(expectedQuery, [7, 'value', null]))

    expect(result.query).toBe(expectedQuery)
    expect(JSON.parse(result.parameters!.values)).toEqual([7, 'value', null])
  })
})
