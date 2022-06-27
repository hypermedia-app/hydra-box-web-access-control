import { describe, it } from 'mocha'
import { acl, prov, rdf, schema } from '@tpluscode/rdf-ns-builders/loose'
import clownface from 'clownface'
import $rdf from 'rdf-ext'
import { expect } from 'chai'
import { INSERT, sparql } from '@tpluscode/sparql-builder'
import { Variable } from '@rdfjs/types'
import { check } from '../index'
import { agentGroup } from '../checks'
import { client, insertAcls, insertData, resource } from './data'

describe('rdf-web-access-control', () => {
  before(insertData)
  beforeEach(insertAcls)

  describe('check', () => {
    function additionalPatterns(acl: Variable) {
      return sparql`${acl} ${prov.component} <urn:acl:component> .`
    }

    async function insertProvenance() {
      await INSERT`
        GRAPH ?acl {
          ?acl ${prov.component} <urn:acl:component> .
        }
      `.WHERE`
        GRAPH ?acl {
          ?acl a ${acl.Authorization} .
        }
      `.execute(client.query)
    }

    describe('ResourceCheck', () => {
      describe('direct access', () => {
        it('should be granted', async () => {
          // when
          const hasAccess = await check({
            client,
            accessMode: acl.Write,
            term: resource.Penny,
            agent: clownface({ dataset: $rdf.dataset(), term: resource.Leonard }),
          })

          // then
          expect(hasAccess).to.be.true
        })

        it('should be granted if one of multiple matches', async () => {
          // when
          const hasAccess = await check({
            client,
            accessMode: acl.Write,
            term: [resource.Kripke, resource.Penny],
            agent: clownface({ dataset: $rdf.dataset(), term: resource.Leonard }),
          })

          // then
          expect(hasAccess).to.be.true
        })

        it('should not be granted if no ACL exists', async () => {
          // when
          const hasAccess = await check({
            client,
            accessMode: acl.Write,
            term: resource.Kripke,
            agent: clownface({ dataset: $rdf.dataset(), term: resource.Leonard }),
          })

          // then
          expect(hasAccess).to.be.false
        })

        it('should not be granted if additional pattern is not matched', async () => {
          // when
          const hasAccess = await check({
            client,
            accessMode: acl.Write,
            term: resource.Penny,
            agent: clownface({ dataset: $rdf.dataset(), term: resource.Leonard }),
            additionalPatterns,
          })

          // then
          expect(hasAccess).to.be.false
        })

        it('should be granted if additional pattern is matched', async () => {
          // given
          await insertProvenance()

          // when
          const hasAccess = await check({
            client,
            accessMode: acl.Write,
            term: resource.Penny,
            agent: clownface({ dataset: $rdf.dataset(), term: resource.Leonard }),
            additionalPatterns,
          })

          // then
          expect(hasAccess).to.be.true
        })
      })

      it('ignores blank node agent types', async () => {
        // when
        const hasAccess = await check({
          client,
          accessMode: acl.Write,
          term: resource.Penny,
          agent: clownface({ dataset: $rdf.dataset(), term: resource.Leonard })
            .addOut(rdf.type, $rdf.blankNode()),
        })

        // then
        expect(hasAccess).to.be.true
      })

      describe('access to class', () => {
        it('should be granted', async () => {
          // when
          const hasAccess = await check({
            client,
            accessMode: acl.Read,
            term: resource.Caltech,
            agent: clownface({ dataset: $rdf.dataset(), term: resource.Sheldon }),
          })

          // then
          expect(hasAccess).to.be.true
        })

        it('should be granted if additional pattern is matched', async () => {
          // given
          await insertProvenance()

          // when
          const hasAccess = await check({
            client,
            accessMode: acl.Read,
            term: resource.Caltech,
            agent: clownface({ dataset: $rdf.dataset(), term: resource.Sheldon }),
            additionalPatterns,
          })

          // then
          expect(hasAccess).to.be.true
        })

        it('should not be granted if additional pattern is not matched', async () => {
          // when
          const hasAccess = await check({
            client,
            accessMode: acl.Read,
            term: resource.Caltech,
            agent: clownface({ dataset: $rdf.dataset(), term: resource.Sheldon }),
            additionalPatterns,
          })

          // then
          expect(hasAccess).to.be.false
        })
      })

      describe('access to class for anonymous', () => {
        it('should be granted', async () => {
          // when
          const hasAccess = await check({
            client,
            accessMode: acl.Read,
            term: resource.PublicReport,
          })

          // then
          expect(hasAccess).to.be.true
        })

        it('should be granted when additional pattern matches', async () => {
          // given
          await insertProvenance()

          // when
          const hasAccess = await check({
            client,
            accessMode: acl.Read,
            term: resource.PublicReport,
            additionalPatterns,
          })

          // then
          expect(hasAccess).to.be.true
        })

        it('should not be granted when additional pattern does not match', async () => {
          // when
          const hasAccess = await check({
            client,
            accessMode: acl.Read,
            term: resource.PublicReport,
            additionalPatterns,
          })

          // then
          expect(hasAccess).to.be.false
        })
      })

      describe('when agent owns resource', () => {
        it('should be granted', async () => {
          // when
          const hasAccess = await check({
            client,
            accessMode: acl.Read,
            term: resource.PrivateReport,
            agent: clownface({ dataset: $rdf.dataset(), term: resource.Howard }),
          })

          // then
          expect(hasAccess).to.be.true
        })

        it('should be granted when additional patterns are matched', async () => {
          // given
          await insertProvenance()

          // when
          const hasAccess = await check({
            client,
            accessMode: acl.Read,
            term: resource.PrivateReport,
            agent: clownface({ dataset: $rdf.dataset(), term: resource.Howard }),
            additionalPatterns,
          })

          // then
          expect(hasAccess).to.be.true
        })

        it('should be granted when additional patterns are not matched', async () => {
          // when
          const hasAccess = await check({
            client,
            accessMode: acl.Read,
            term: resource.PrivateReport,
            agent: clownface({ dataset: $rdf.dataset(), term: resource.Howard }),
            additionalPatterns,
          })

          // then
          expect(hasAccess).to.be.true
        })
      })

      describe('access to class of resources for class of agents', () => {
        it('should be granted', async () => {
          // when
          const hasAccess = await check({
            client,
            accessMode: acl.Write,
            term: resource.Comment,
            agent: clownface({ dataset: $rdf.dataset(), term: resource.Howard })
              .addOut(rdf.type, schema.Employee),
          })

          // then
          expect(hasAccess).to.be.true
        })

        it('should be granted when additional patterns match', async () => {
          // given
          await insertProvenance()

          // when
          const hasAccess = await check({
            client,
            accessMode: acl.Write,
            term: resource.Comment,
            agent: clownface({ dataset: $rdf.dataset(), term: resource.Howard })
              .addOut(rdf.type, schema.Employee),
            additionalPatterns,
          })

          // then
          expect(hasAccess).to.be.true
        })

        it('should not be granted when additional patterns do not match', async () => {
          // when
          const hasAccess = await check({
            client,
            accessMode: acl.Write,
            term: resource.Comment,
            agent: clownface({ dataset: $rdf.dataset(), term: resource.Howard })
              .addOut(rdf.type, schema.Employee),
            additionalPatterns,
          })

          // then
          expect(hasAccess).to.be.false
        })
      })

      it('should not be granted if resource does not exist', async () => {
        // when
        const hasAccess = await check({
          client,
          accessMode: acl.Read,
          term: resource.Foobar,
          agent: clownface({ dataset: $rdf.dataset(), term: resource.Sheldon }),
        })

        // then
        expect(hasAccess).to.be.false
      })

      describe('custom check', () => {
        it('should grant access per extra check', async () => {
          // when
          const hasAccess = await check({
            client,
            accessMode: acl.Read,
            term: resource.PrivateReport,
            agent: clownface({ dataset: $rdf.dataset(), term: resource.Penny }),
            additionalChecks: [({ authorization, agent }) => sparql`${authorization} ${acl.accessTo}/${resource.sharedWith} ${agent}`],
          })

          // then
          expect(hasAccess).to.be.true
        })

        it('should grant access per group check to its members', async () => {
          // when
          const hasAccess = await check({
            client,
            accessMode: acl.Read,
            term: resource.PrivateReport,
            agent: clownface({ dataset: $rdf.dataset(), term: resource.Penny }),
            additionalChecks: [agentGroup],
          })

          // then
          expect(hasAccess).to.be.true
        })

        it('should not grant access per group check to non members', async () => {
          // when
          const hasAccess = await check({
            client,
            accessMode: acl.Read,
            term: resource.PrivateReport,
            agent: clownface({ dataset: $rdf.dataset(), term: resource.Sheldon }),
            additionalChecks: [agentGroup],
          })

          // then
          expect(hasAccess).to.be.false
        })
      })
    })

    describe('TypeCheck', () => {
      describe('access to class of resources for class of agents', () => {
        it('should be granted', async () => {
          // when
          const hasAccess = await check({
            client,
            accessMode: acl.Write,
            agent: clownface({ dataset: $rdf.dataset(), term: resource.Howard })
              .addOut(rdf.type, schema.Employee),
            types: [schema.Comment],
          })

          // then
          expect(hasAccess).to.be.true
        })

        it('should be granted when additional patterns match', async () => {
          // given
          await insertProvenance()

          // when
          const hasAccess = await check({
            client,
            accessMode: acl.Write,
            agent: clownface({ dataset: $rdf.dataset(), term: resource.Howard })
              .addOut(rdf.type, schema.Employee),
            types: [schema.Comment],
            additionalPatterns,
          })

          // then
          expect(hasAccess).to.be.true
        })

        it('should not be granted when additional patterns match', async () => {
          // when
          const hasAccess = await check({
            client,
            accessMode: acl.Write,
            agent: clownface({ dataset: $rdf.dataset(), term: resource.Howard })
              .addOut(rdf.type, schema.Employee),
            types: [schema.Comment],
            additionalPatterns,
          })

          // then
          expect(hasAccess).to.be.false
        })
      })

      it('ignores blank node types', async () => {
        // when
        const hasAccess = await check({
          client,
          accessMode: acl.Write,
          agent: clownface({ dataset: $rdf.dataset(), term: resource.Howard })
            .addOut(rdf.type, schema.Employee)
            .addOut(rdf.type, $rdf.blankNode()),
          types: [schema.Comment, $rdf.blankNode()],
        })

        // then
        expect(hasAccess).to.be.true
      })

      describe('access to class of resources', () => {
        it('should be granted', async () => {
          // when
          const hasAccess = await check({
            client,
            accessMode: acl.Write,
            agent: clownface({ dataset: $rdf.dataset(), term: resource.Howard }),
            types: [schema.ScholarlyArticle],
          })

          // then
          expect(hasAccess).to.be.true
        })

        it('should be granted when additional patterns match', async () => {
          // given
          await insertProvenance()

          // when
          const hasAccess = await check({
            client,
            accessMode: acl.Write,
            agent: clownface({ dataset: $rdf.dataset(), term: resource.Howard }),
            types: [schema.ScholarlyArticle],
            additionalPatterns,
          })

          // then
          expect(hasAccess).to.be.true
        })

        it('should not be granted when additional patterns do not match', async () => {
          // when
          const hasAccess = await check({
            client,
            accessMode: acl.Write,
            agent: clownface({ dataset: $rdf.dataset(), term: resource.Howard }),
            types: [schema.ScholarlyArticle],
            additionalPatterns,
          })

          // then
          expect(hasAccess).to.be.false
        })
      })

      describe('anonymous access to class of resources', () => {
        it('should be granted', async () => {
          // when
          const hasAccess = await check({
            client,
            accessMode: acl.Read,
            types: [schema.CreativeWork],
          })

          // then
          expect(hasAccess).to.be.true
        })

        it('should be granted when additional patterns match', async () => {
          // given
          await insertProvenance()

          // when
          const hasAccess = await check({
            client,
            accessMode: acl.Read,
            types: [schema.CreativeWork],
            additionalPatterns,
          })

          // then
          expect(hasAccess).to.be.true
        })

        it('should not be granted when additional patterns do not match', async () => {
          // when
          const hasAccess = await check({
            client,
            accessMode: acl.Read,
            types: [schema.CreativeWork],
            additionalPatterns,
          })

          // then
          expect(hasAccess).to.be.false
        })
      })
    })
  })
})
