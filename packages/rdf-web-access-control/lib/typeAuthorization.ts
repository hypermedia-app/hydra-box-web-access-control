import { variable } from '@rdfjs/data-model'
import { ASK, sparql, SparqlTemplateResult } from '@tpluscode/sparql-builder'
import { acl, foaf, rdfs } from '@tpluscode/rdf-ns-builders'
import type { SparqlAskExecutable } from '@tpluscode/sparql-builder/lib'
import type { AuthorizationPatterns, TypeCheck } from '..'
import { agentClasses, combinePatterns, onlyNamedNodes } from '.'

export function typeAuthorization(
  { agent, accessMode, types, additionalPatterns = [] }: Omit<TypeCheck, 'client'>,
  authorizationChecks: AuthorizationPatterns[],
): SparqlAskExecutable {
  const agentTerm = agent?.term.termType === 'NamedNode' ? agent.term : null
  const authorization = variable('authorization')
  const check = { authorization, agent: variable('agent'), agentClass: variable('agentClass') }

  const values = sparql`
    VALUES ?mode { ${acl.Control} ${accessMode} }
    VALUES ?type { ${rdfs.Resource} ${types.filter(onlyNamedNodes)} }
    VALUES ?agent { ${agentTerm || '<>'} }
    VALUES ?agentClass { ${foaf.Agent} ${agentClasses(agent).filter(onlyNamedNodes)} }
    `

  const patternUnion = authorizationChecks.reduce((previous: SparqlTemplateResult | string, buildPatterns) => {
    const next = sparql`{
      ${values}

      ${authorization} a ${acl.Authorization} ;
                     ${acl.mode} ?mode ;
                     ${acl.accessToClass} ?type .
      ${buildPatterns(check)}
    }`

    if (typeof previous === 'string') {
      return next
    }

    return sparql`${previous} UNION ${next}`
  }, '')

  return ASK`
    ${combinePatterns(additionalPatterns, authorization)}

    ${patternUnion}`
}
