import asyncMiddleware from 'middleware-async'
import error from 'http-errors'
import type { StreamClient } from 'sparql-http-client/StreamClient'
import type * as express from 'express'
import { acl } from '@tpluscode/rdf-ns-builders'
import { check, AdditionalPatterns } from 'rdf-web-access-control'
import { Variable } from '@rdfjs/types'
import type { SparqlTemplateResult } from '@tpluscode/sparql-builder'

export interface AclPatterns {
  (acl:Variable, req: express.Request): SparqlTemplateResult | string
}

interface Option {
  client: StreamClient
  additionalPatterns?: AclPatterns | AclPatterns[]
}

function wrapPatterns(patterns: Option['additionalPatterns'] = [], req: express.Request): AdditionalPatterns[] {
  const arr = Array.isArray(patterns) ? patterns : [patterns]
  return arr.map(func => acl => func(acl, req))
}

export default ({ client, additionalPatterns }: Option): express.RequestHandler => asyncMiddleware(async (req, res, next) => {
  if (!req.hydra.resource) {
    return next()
  }

  let accessMode = req.hydra.operation?.out(acl.mode).term

  if (!accessMode) {
    switch (req.method.toUpperCase()) {
      case 'GET':
      case 'HEAD':
      case 'OPTIONS':
        accessMode = acl.Read
        break
      case 'POST':
      case 'PUT':
      case 'PATCH':
      case 'DELETE':
        accessMode = acl.Write
        break
    }
  }

  if (accessMode?.termType !== 'NamedNode') {
    return next(new error.InternalServerError('Could not determine ACL mode for operation'))
  }

  const result = await check({
    term: req.hydra.term,
    accessMode,
    client,
    agent: req.agent,
    additionalPatterns: wrapPatterns(additionalPatterns, req),
  })

  if (!result) {
    return next(new error.Forbidden())
  }

  return next()
})
