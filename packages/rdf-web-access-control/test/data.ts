import fs from 'fs'
import path from 'path'
import * as url from 'url'
import StreamClient from 'sparql-http-client'
import ParsingClient from 'sparql-http-client/ParsingClient.js'
import * as compose from 'docker-compose'
import waitOn from 'wait-on'
import { Context } from 'mocha'
import rdf from '@zazuko/env'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

export const resource = rdf.namespace('http://example.com/')

const endpoint = {
  endpointUrl: 'http://localhost:3030/wac/query',
  updateUrl: 'http://localhost:3030/wac/update',
  user: 'admin',
  password: 'prassword',
}

export const client = new StreamClient(endpoint)
export const parsingClient = new ParsingClient(endpoint)

export async function insertData(this: Context) {
  this.timeout(200000)
  await compose.upAll()
  await waitOn({
    resources: ['http://localhost:3030'],
  })

  const exampleData = fs.readFileSync(path.resolve(__dirname, '../../../examples/data.ru'))
  await client.query.update(exampleData.toString())
}

export function insertAcls(this: Context) {
  this.timeout(20000)
  const exampleAcls = fs.readFileSync(path.resolve(__dirname, '../../../examples/acls.ru'))
  return client.query.update(exampleAcls.toString())
}
