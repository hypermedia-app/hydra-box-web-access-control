import { describe, it } from 'mocha'
import $rdf from '@zazuko/env'
import { SELECT } from '@tpluscode/sparql-builder'
import { expect } from 'chai'
import { agentGroup } from '../checks.js'
import { insertAcls, insertData, parsingClient, resource } from './data.js'

describe('rdf-web-access-control/checks', () => {
  before(insertData)
  beforeEach(insertAcls)

  it('should find agent by group', async () => {
    // given
    const patterns = agentGroup({
      authorization: $rdf.variable('authorization'),
      agent: resource.Penny,
      agentClass: $rdf.variable('agentClass'),
    })

    // when
    const [{ authorization }] = await SELECT`?authorization`.WHERE`${patterns}`.execute(parsingClient.query)

    // then
    expect(authorization).to.deep.eq($rdf.namedNode('urn:acl:howard-shares-with-group'))
  })
})
