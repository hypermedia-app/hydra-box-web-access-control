import { sparql } from '@tpluscode/sparql-builder'
import { acl, vcard } from '@tpluscode/rdf-ns-builders/strict'
import type { AuthorizationPatterns } from '.'

export const agentClass: AuthorizationPatterns = ({ authorization, agentClass }) => {
  return sparql`${authorization} ${acl.agentClass} ${agentClass} .`
}

export const agent: AuthorizationPatterns = ({ agent, authorization }) => {
  return sparql`${authorization} ${acl.agent} ${agent} .`
}

export const agentGroup: AuthorizationPatterns = ({ agent, authorization }) => {
  return sparql`${authorization} ${acl.agentGroup}/${vcard.hasMember} ${agent} .`
}
