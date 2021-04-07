import fs from 'fs'
import * as path from 'path'
import { describe, it } from 'mocha'
import * as compose from 'docker-compose'
import waitOn from 'wait-on'
import StreamClient from 'sparql-http-client'
import { acl, rdf, schema } from '@tpluscode/rdf-ns-builders'
import namespace from '@rdfjs/namespace'
import clownface from 'clownface'
import $rdf from 'rdf-ext'
import { expect } from 'chai'
import { check } from '../index'

const resource = namespace('http://example.com/')

describe('rdf-web-access-control', function () {
  this.timeout(200000)

  const client = new StreamClient({
    endpointUrl: 'http://localhost:3030/wac/query',
    updateUrl: 'http://localhost:3030/wac/update',
    user: 'admin',
    password: 'password',
  })

  before(async () => {
    await compose.upAll()
    await waitOn({
      resources: ['http://localhost:3030'],
    })

    const exampleAcls = fs.readFileSync(path.resolve(__dirname, '../../../examples/acls.ru'))
    await client.query.update(exampleAcls.toString())

    const exampleData = fs.readFileSync(path.resolve(__dirname, '../../../examples/data.ru'))
    await client.query.update(exampleData.toString())
  })

  describe('check', () => {
    describe('ResourceCheck', () => {
      it('should be true when directly granted access', async () => {
        // when
        const hasAccess = await check({
          client,
          accessMode: acl.Write,
          term: resource.Penny,
          agent: clownface({ dataset: $rdf.dataset(), term: resource.Leonard }),
        })

        // then
        expect(hasAccess).to.be.true
      })

      it('should be true when granted access to class', async () => {
        // when
        const hasAccess = await check({
          client,
          accessMode: acl.Read,
          term: resource.Caltech,
          agent: clownface({ dataset: $rdf.dataset(), term: resource.Sheldon }),
        })

        // then
        expect(hasAccess).to.be.true
      })

      it('should be true when granted access to class for anonymous', async () => {
        // when
        const hasAccess = await check({
          client,
          accessMode: acl.Read,
          term: resource.PublicReport,
        })

        // then
        expect(hasAccess).to.be.true
      })

      it('should be true when agent owns resource', async () => {
        // when
        const hasAccess = await check({
          client,
          accessMode: acl.Read,
          term: resource.PrivateReport,
          agent: clownface({ dataset: $rdf.dataset(), term: resource.Howard }),
        })

        // then
        expect(hasAccess).to.be.true
      })

      it('should be true when granted access to class of resources for class of agents', async () => {
        // when
        const hasAccess = await check({
          client,
          accessMode: acl.Write,
          term: resource.Comment,
          agent: clownface({ dataset: $rdf.dataset(), term: resource.Howard })
            .addOut(rdf.type, schema.Employee),
        })

        // then
        expect(hasAccess).to.be.true
      })

      it('should be false if resource does not exist', async () => {
        // when
        const hasAccess = await check({
          client,
          accessMode: acl.Read,
          term: resource.Foobar,
          agent: clownface({ dataset: $rdf.dataset(), term: resource.Sheldon }),
        })

        // then
        expect(hasAccess).to.be.false
      })
    })

    describe('TypeCheck', () => {
      it('should be true when granted access to class of resources for class of agents', async () => {
        // when
        const hasAccess = await check({
          client,
          accessMode: acl.Write,
          agent: clownface({ dataset: $rdf.dataset(), term: resource.Howard })
            .addOut(rdf.type, schema.Employee),
          types: [schema.Comment],
        })

        // then
        expect(hasAccess).to.be.true
      })

      it('should be true when granted access to class of resources', async () => {
        // when
        const hasAccess = await check({
          client,
          accessMode: acl.Write,
          agent: clownface({ dataset: $rdf.dataset(), term: resource.Howard }),
          types: [schema.ScholarlyArticle],
        })

        // then
        expect(hasAccess).to.be.true
      })
    })
  })
})
