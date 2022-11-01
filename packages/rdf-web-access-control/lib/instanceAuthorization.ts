import { variable } from '@rdfjs/data-model'
import { ASK, sparql } from '@tpluscode/sparql-builder'
import { acl, foaf } from '@tpluscode/rdf-ns-builders'
import type { SparqlAskExecutable } from '@tpluscode/sparql-builder/lib'
import type { AuthorizationPatterns, ResourceCheck } from '..'
import { agentClasses, combinePatterns, onlyNamedNodes } from '.'

export function instanceAuthorization(
  { agent, accessMode, term: terms, additionalPatterns = [] }: Omit<ResourceCheck, 'client'>,
  authorizationChecks: AuthorizationPatterns[],
): SparqlAskExecutable {
  const agentTerm = agent?.term.termType === 'NamedNode' ? agent.term : null
  const authorization = variable('authorization')
  const check = { authorization, agent: variable('agent'), agentClass: variable('agentClass') }
  const term = variable('term')

  const values = sparql`
    VALUES ?mode { ${acl.Control} ${accessMode} }
    VALUES ?agent { ${agentTerm || '<>'} }
    VALUES ?agentClass { ${foaf.Agent} ${agentClasses(agent).filter(onlyNamedNodes)} }
    VALUES ?term { ${terms} }
  `

  return ASK`${(authorizationChecks.reduce((previous, buildPatterns) => {
    return sparql`${previous}
    UNION
    {
      ${values}

      ${authorization} a ${acl.Authorization} ;
                     ${acl.mode} ?mode ;
                     ${acl.accessTo} ${term} .
      ${buildPatterns(check)}
      ${combinePatterns(additionalPatterns, authorization)}
    }
    UNION
    {
      ${values}

      ${term} a ?type .
      ${authorization} a ${acl.Authorization} ;
                     ${acl.mode} ?mode ;
                     ${acl.accessToClass} ?type .
      ${buildPatterns(check)}
      ${combinePatterns(additionalPatterns, authorization)}
    }`
  }, sparql`{
    ${values}

    ${term} ${acl.owner} ?agent .
  }`))}`
}
