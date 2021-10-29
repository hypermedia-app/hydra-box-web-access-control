import { describe, it } from 'mocha'
import { namedNode, variable } from '@rdfjs/data-model'
import { SELECT } from '@tpluscode/sparql-builder'
import { expect } from 'chai'
import { agentGroup } from '../checks'
import { insertAcls, insertData, parsingClient, resource } from './data'

describe('rdf-web-access-control/checks', () => {
  before(insertData)
  beforeEach(insertAcls)

  it('should find agent by group', async () => {
    // given
    const patterns = agentGroup({
      authorization: variable('authorization'),
      agent: resource.Penny,
      agentClass: variable('agentClass'),
    })

    // when
    const [{ authorization }] = await SELECT`?authorization`.WHERE`${patterns}`.execute(parsingClient.query)

    // then
    expect(authorization).to.deep.eq(namedNode('urn:acl:howard-shares-with-group'))
  })
})
