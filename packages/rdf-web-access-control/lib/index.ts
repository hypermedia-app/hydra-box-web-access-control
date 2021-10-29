import { Term, Variable } from '@rdfjs/types'
import type { GraphPointer } from 'clownface'
import { acl, rdf } from '@tpluscode/rdf-ns-builders'
import { sparql, SparqlTemplateResult } from '@tpluscode/sparql-builder'
import type { Check } from '..'

export function onlyNamedNodes({ termType }: Term): boolean {
  return termType === 'NamedNode'
}

export function agentClasses(agent: GraphPointer | undefined): Term[] {
  return agent
    ? [...agent.out(rdf.type).terms, acl.AuthenticatedAgent]
    : []
}

export function combinePatterns(patterns: Required<Check>['additionalPatterns'], acl: Variable): SparqlTemplateResult {
  if (Array.isArray(patterns)) {
    return patterns.reduce((prev, next) => sparql`${prev}\n${next(acl)}`, sparql``)
  }

  return patterns(acl)
}
