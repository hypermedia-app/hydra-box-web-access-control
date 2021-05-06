import { NamedNode, Term } from 'rdf-js'
import { ASK } from '@tpluscode/sparql-builder'
import type { StreamClient } from 'sparql-http-client/StreamClient'
import { acl, foaf, rdf, rdfs } from '@tpluscode/rdf-ns-builders'
import type { GraphPointer } from 'clownface'

interface Check {
  accessMode: NamedNode[] | NamedNode
  client: StreamClient
  agent?: GraphPointer
}

interface ResourceCheck extends Check {
  term: NamedNode
}

interface TypeCheck extends Check {
  types: Term[]
}

declare module 'express-serve-static-core' {
  export interface Request {
    agent?: GraphPointer<NamedNode>
  }
}

function onlyNamedNodes({ termType }: Term) {
  return termType === 'NamedNode'
}

function agentClass(agent: GraphPointer | undefined) {
  return agent
    ? [...agent.out(rdf.type).terms, acl.AuthenticatedAgent]
    : []
}

function directAuthorization({ agent, accessMode, term }: Omit<ResourceCheck, 'client'>) {
  const agentTerm = agent?.term.termType === 'NamedNode' ? agent.term : null

  return ASK`
    VALUES ?mode { ${acl.Control} ${accessMode} }
    VALUES ?agent { ${agentTerm || '<>'} }
    VALUES ?agentClass { ${foaf.Agent} ${agentClass(agent).filter(onlyNamedNodes)} }

    {
      ?authorization a ${acl.Authorization} ;
                     ${acl.mode} ?mode ;
                     ${acl.agentClass} ?agentClass ;
                     ${acl.accessTo} ${term} ;
    }
    union
    {
      ?authorization a ${acl.Authorization} ;
                     ${acl.mode} ?mode ;
                     ${acl.agent} ?agent ;
                     ${acl.accessTo} ${term} ;
    }
    union
    {
      ${term} a ?type .
      ?authorization a ${acl.Authorization} ;
                     ${acl.mode} ?mode ;
                     ${acl.agentClass} ?agentClass ;
                     ${acl.accessToClass} ?type ;
    }
    union
    {
      ${term} a ?type .
      ?authorization a ${acl.Authorization} ;
                     ${acl.mode} ?mode ;
                     ${acl.agent} ?agent ;
                     ${acl.accessToClass} ?type ;
    }
    union
    {
      ${term} ${acl.owner} ?agent .
    }`
}

function typeAuthorization({ agent, accessMode, types }: Omit<TypeCheck, 'client'>) {
  const agentTerm = agent?.term.termType === 'NamedNode' ? agent.term : null

  return ASK`
    VALUES ?mode { ${acl.Control} ${accessMode} }
    VALUES ?type { ${rdfs.Resource} ${types.filter(onlyNamedNodes)} }
    VALUES ?agent { ${agentTerm || '<>'} }
    VALUES ?agentClass { ${foaf.Agent} ${agentClass(agent).filter(onlyNamedNodes)} }

    {
      ?authorization a ${acl.Authorization} ;
                     ${acl.mode} ?mode ;
                     ${acl.agentClass} ?agentClass ;
                     ${acl.accessToClass} ?type ;
    }
    union
    {
      ?authorization a ${acl.Authorization} ;
                     ${acl.mode} ?mode ;
                     ${acl.agent} ?agent ;
                     ${acl.accessToClass} ?type ;
    }`
}

export function check({ client, ...check }: ResourceCheck | TypeCheck): Promise<boolean> {
  if ('term' in check) {
    return directAuthorization(check).execute(client.query)
  }

  return typeAuthorization(check).execute(client.query)
}
