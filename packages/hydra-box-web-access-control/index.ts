import asyncMiddleware from 'middleware-async'
import error from 'http-errors'
import type { StreamClient } from 'sparql-http-client/StreamClient'
import type * as express from 'express'
import { acl } from '@tpluscode/rdf-ns-builders'
import { check } from 'rdf-web-access-control'

interface Option {
  client: StreamClient
}

export const middleware = ({ client }: Option): express.RequestHandler => asyncMiddleware(async (req, res, next) => {
  if (!req.hydra.resource) {
    return next()
  }

  let accessMode = req.hydra.operation?.out(acl.mode).term

  if (!accessMode) {
    switch (req.method.toUpperCase()) {
      case 'GET':
        accessMode = acl.Read
        break
      case 'POST':
      case 'PUT':
        accessMode = acl.Write
        break
      case 'DELETE':
        accessMode = acl.Delete
        break
    }
  }

  if (!accessMode) {
    return next(new error.InternalServerError('Could not determine ACL mode for operation'))
  }

  const result = await check({
    term: req.hydra.term,
    accessMode,
    client,
    agent: req.agent,
  })

  if (!result) {
    return next(new error.Forbidden())
  }

  return next()
})
