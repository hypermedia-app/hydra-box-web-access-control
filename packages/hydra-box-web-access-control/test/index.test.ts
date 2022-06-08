import { NamedNode } from '@rdfjs/types'
import { describe, it, beforeEach } from 'mocha'
import express, { Express } from 'express'
import request from 'supertest'
import httpStatus from 'http-status'
import * as acl from 'rdf-web-access-control'
import sinon from 'sinon'
import { expect } from 'chai'
import * as ns from '@tpluscode/rdf-ns-builders'
import clownface from 'clownface'
import $rdf from 'rdf-ext'
import accessControl from '..'

describe('hydra-box-web-access-control', () => {
  let app: Express
  let aclSpy: sinon.SinonStubbedInstance<typeof acl>
  const client = {} as any
  const term = $rdf.namedNode('http://example.com/resource')
  const resourceTerm = $rdf.namedNode('http://example.com/resource2')

  beforeEach(() => {
    app = express()
    app.use(function hydraBoxMock(req, res, next) {
      req.hydra = {
        term,
        resource: {
          term: resourceTerm,
        },
      } as any
      next()
    })

    aclSpy = sinon.stub(acl)
  })

  afterEach(() => {
    sinon.restore()
  })

  it('passes right parameters to check', async () => {
    // given
    const additionalPatterns = sinon.stub()
    const agent = clownface({ dataset: $rdf.dataset() }).namedNode('')
    app.use((req, res, next) => {
      req.agent = agent
      next()
    })
    app.use(accessControl({
      client,
      additionalPatterns,
    }))

    // when
    await request(app).get('/resource')

    // then
    expect(acl.check).to.have.been.calledWith(sinon.match({
      client,
      agent,
      term: [term, resourceTerm],
      additionalPatterns: sinon.match.array,
    }))
  })

  it('responds 401 when access is not granted', async () => {
    // given
    app.use(accessControl({
      client,
    }))
    aclSpy.check.resolves(false)

    // when
    const response = request(app).get('/resource')

    // then
    await response.expect(httpStatus.UNAUTHORIZED)
  })

  it('responds 403 when access is not granted and a user is authenticated', async () => {
    // given
    const agent = clownface({ dataset: $rdf.dataset() }).namedNode('')
    app.use((req, res, next) => {
      req.agent = agent
      next()
    })
    app.use(accessControl({
      client,
    }))
    aclSpy.check.resolves(false)

    // when
    const response = request(app).get('/resource')

    // then
    await response.expect(httpStatus.FORBIDDEN)
  })

  it('does nothing if request has no hydra resource', async () => {
    // given
    app.use((req, res, next) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      delete req.hydra.resource
      next()
    })
    app.use(accessControl({
      client,
    }))
    aclSpy.check.resolves(false)

    // when
    await request(app).get('/resource')

    // then
    expect(acl.check).not.to.have.been.called
  })

  it('responds 200 when access is granted', async () => {
    // given
    aclSpy.check.resolves(true)
    app.use(accessControl({
      client,
    }))
    app.use((req, res) => res.end())

    // when
    const response = request(app).get('/resource')

    // then
    await response.expect(httpStatus.OK)
  })

  it('uses acl mode from hydra operation', async () => {
    // given
    app.use((req, res, next) => {
      req.hydra.operation = clownface({ dataset: $rdf.dataset() })
        .blankNode()
        .addOut(ns.acl.mode, ns.acl.Delete)
      next()
    })
    app.use(accessControl({
      client,
    }))

    // when
    await request(app).get('/resource')

    // then
    expect(acl.check).to.have.been.calledWith(sinon.match({
      accessMode: ns.acl.Delete,
    }))
  })

  it('responds 500 if method is not mapped', async () => {
    // given
    app.use(accessControl({
      client,
    }))

    // when
    const response = request(app).merge('/resource')

    // then
    await response.expect(httpStatus.INTERNAL_SERVER_ERROR)
  })

  type SuperTestMethods = 'get' | 'head' | 'options' | 'put' | 'post' | 'patch' | 'delete'
  const mappedMethods: [SuperTestMethods, NamedNode][] = [
    ['get', ns.acl.Read],
    ['head', ns.acl.Read],
    ['options', ns.acl.Read],
    ['put', ns.acl.Write],
    ['post', ns.acl.Write],
    ['patch', ns.acl.Write],
    ['delete', ns.acl.Write],
  ]

  for (const [method, accessMode] of mappedMethods) {
    it(`maps method ${method} to mode ${accessMode.value}`, async () => {
      // given
      aclSpy.check.resolves(true)
      app.use(accessControl({
        client,
      }))
      app.use((req, res) => res.end())

      // when
      await request(app)[method]('/resource')

      // then
      expect(acl.check).to.have.been.calledWith(sinon.match({
        accessMode,
      }))
    })
  }
})
