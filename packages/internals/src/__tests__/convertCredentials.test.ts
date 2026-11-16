import { credentialsToUri, protocolToConnectorType, uriToCredentials } from '../convertCredentials'

const uris = [
  'file:',
  'file:dev.db',
  'file:/absolute-dev.db',
  'file:./current-dev.db',
  'file:../parent-dev.db',
  'file:../../parent-parent-dev.db',
  'postgresql://localhost:5433?schema=production',
  'postgresql://other@localhost/otherdb?schema=my_schema&connect_timeout=10&application_name=myapp',
  'postgresql://',
  'postgresql://localhost',
  'postgresql://localhost:5433',
  'postgresql://localhost/mydb',
  'postgresql://user@localhost',
  'postgresql://user:secret@localhost',
  'postgresql://user:secret@localhost?sslmode=prefer',
  'mysql://user:password@localhost:3333',
  'mysql://user@localhost:3333',
  'mysql://user@localhost:3333/dbname',
  'mysql://user@localhost:3333/dbname?sslmode=prefer',
  'mongodb://mongodb0.example.com:27017/admin',
  'mongodb://myDBReader:D1fficultP%40ssw0rd@mongodb0.example.com:27017/admin',
]

for (const uri of uris) {
  test(`Convert ${uri}`, () => {
    const credentials = uriToCredentials(uri)
    const uriFromCredentials = credentialsToUri(credentials)

    expect(credentials).toMatchSnapshot()
    expect(uriFromCredentials).toMatchSnapshot()

    expect(uriFromCredentials).toBe(uri)
  })
}

const notIdenticalUris = [
  'postgresql://root:prisma@localhost/prisma?host=/var/run/postgresql/',
  'mysql://root@localhost/db?socket=/private/tmp/mysql.sock',
  'mysql://user:specialatchar@password@localhost:3333',
  'mongodb+srv://root:randompassword@cluster0.ab1cd.mongodb.net/mydb?retryWrites=true&w=majority',
]

for (const uri of notIdenticalUris) {
  test(`Convert ${uri}`, () => {
    const credentials = uriToCredentials(uri)
    const uriFromCredentials = credentialsToUri(credentials)

    expect(credentials).toMatchSnapshot()
    expect(uriFromCredentials).toMatchSnapshot()
  })
}

describe.each(['kingbase-mysql', 'kingbase-oracle'] as const)('%s credentials', (provider) => {
  test('preserves the provider, database, schema and connection options', () => {
    const uri = `${provider}://user:password@localhost:54321/mydb?schema=tenant&connect_timeout=10&application_name=myapp`
    const credentials = uriToCredentials(uri)

    expect(credentials).toMatchObject({
      type: provider,
      host: 'localhost',
      port: 54321,
      user: 'user',
      password: 'password',
      database: 'mydb',
      schema: 'tenant',
      extraFields: { connect_timeout: '10', application_name: 'myapp' },
    })
    expect(protocolToConnectorType(`${provider}:`)).toBe(provider)
    expect(credentialsToUri(credentials)).toBe(uri)
  })

  test.each([
    'localhost',
    'localhost/mydb',
    'user:p%40ss%3Aword@localhost:54321/mydb',
    'user@localhost/mydb?schema=tenant&socket=%2Ftmp%2Fkes.sock',
    'user@localhost/mydb?schema=tenant&sslmode=require',
    'user@localhost/mydb?host=%2Fvar%2Frun%2Fkingbase',
  ])('round-trips %s', (suffix) => {
    const uri = `${provider}://${suffix}`
    expect(credentialsToUri(uriToCredentials(uri))).toBe(uri)
  })
})

test('normalizes the Kingbase MySQL URL alias without losing connection options', () => {
  const suffix = 'user:password@localhost:54321/mydb?schema=tenant&connect_timeout=10'
  const canonical = uriToCredentials(`kingbase-mysql://${suffix}`)
  const alias = uriToCredentials(`kingbase://${suffix}`)

  expect(alias).toEqual({ ...canonical, uri: `kingbase://${suffix}` })
  expect(protocolToConnectorType('kingbase:')).toBe('kingbase-mysql')
  expect(credentialsToUri(alias)).toBe(`kingbase-mysql://${suffix}`)
})
