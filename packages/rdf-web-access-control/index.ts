import { DatasetCore, NamedNode, Term, Variable } from '@rdfjs/types'
import { SparqlTemplateResult } from '@tpluscode/sparql-builder'
import type { StreamClient } from 'sparql-http-client/StreamClient'
import type { GraphPointer } from 'clownface'
import * as checks from './checks'
import { typeAuthorization } from './lib/typeAuthorization'
import { instanceAuthorization } from './lib/instanceAuthorization'

export interface AdditionalPatterns {
  (acl: Variable): SparqlTemplateResult | string
}

interface AuthorizationCheck {
  authorization: Variable
  agent: Term
  agentClass: Term
}

export interface AuthorizationPatterns {
  (arg: AuthorizationCheck): SparqlTemplateResult | DatasetCore
}

export interface Check {
  accessMode: NamedNode[] | NamedNode
  client: StreamClient
  agent?: GraphPointer
  additionalChecks?: AuthorizationPatterns[]
  additionalPatterns?: AdditionalPatterns | AdditionalPatterns[]
}

export interface ResourceCheck extends Check {
  term: NamedNode | NamedNode[]
}

export interface TypeCheck extends Check {
  types: Term[]
}

declare module 'express-serve-static-core' {
  export interface Request {
    agent?: GraphPointer<NamedNode>
  }
}

export function check({ client, additionalChecks = [], ...rest }: ResourceCheck | TypeCheck): Promise<boolean> {
  const authorizationChecks = [
    checks.agent,
    checks.agentClass,
    ...additionalChecks,
  ]

  if ('term' in rest) {
    return instanceAuthorization(rest, authorizationChecks).execute(client.query)
  }

  return typeAuthorization(rest, authorizationChecks).execute(client.query)
}
