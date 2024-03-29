/* eslint-disable @typescript-eslint/no-explicit-any */
import { NamedNode } from '@rdfjs/types'
import express, { Express } from 'express'
import request from 'supertest'
import httpStatus from 'http-status'
import sinon from 'sinon'
import { expect } from 'chai'
import * as ns from '@tpluscode/rdf-ns-builders/loose'
import $rdf from '@zazuko/env'
import { HydraBox } from '@kopflos-cms/core'
import type StreamClient from 'sparql-http-client/StreamClient.js'
import esmock from 'esmock'

describe('hydra-box-web-access-control', () => {
  let app: Express
  let acl: sinon.SinonStubbedInstance<typeof import('rdf-web-access-control')>
  let accessControl: (typeof import('../index.js').default)
  const client = {} as unknown as StreamClient
  const term = $rdf.namedNode('http://example.com/resource')
  const resourceTerm = $rdf.namedNode('http://example.com/resource2')

  beforeEach(async () => {
    app = express()
    app.use(function hydraBoxMock(req, res, next) {
      req.hydra = {
        term,
        resource: {
          term: resourceTerm,
        },
      } as unknown as HydraBox
      next()
    })

    acl = {
      check: sinon.stub(),
    }
    accessControl = await esmock('../index.js', {
      'rdf-web-access-control': acl,
    })
  })

  afterEach(() => {
    sinon.restore()
  })

  it('passes right parameters to check', async () => {
    // given
    const additionalPatterns = sinon.stub()
    const agent = $rdf.clownface().namedNode('')
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
      agent: sinon.match.same(agent),
      term: [term, resourceTerm],
      additionalPatterns: sinon.match.array,
    }))
  })

  it('responds 401 when access is not granted', async () => {
    // given
    app.use(accessControl({
      client,
    }))
    acl.check.resolves(false)

    // when
    const response = request(app).get('/resource')

    // then
    await response.expect(httpStatus.UNAUTHORIZED)
  })

  it('responds 403 when access is not granted and a user is authenticated', async () => {
    // given
    const agent = $rdf.clownface().namedNode('')
    app.use((req, res, next) => {
      req.agent = agent
      next()
    })
    app.use(accessControl({
      client,
    }))
    acl.check.resolves(false)

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
    acl.check.resolves(false)

    // when
    await request(app).get('/resource')

    // then
    expect(acl.check).not.to.have.been.called
  })

  it('responds 200 when access is granted', async () => {
    // given
    acl.check.resolves(true)
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
      req.hydra.operation = $rdf.clownface()
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
      acl.check.resolves(true)
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
