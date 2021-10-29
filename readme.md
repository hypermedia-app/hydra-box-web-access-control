# web-access-control

Querying [Web Access Control](https://www.w3.org/wiki/WebAccessControl) entries over a SPARQL endpoint to authorize access to resources.

### What it does?

Given the accessed resource and an agent, it executes queries to see if that agent should be granted access to said resource.  

Currently, the library makes some assumptions about the store structure:

1. Protected resources and ACLs have to be in the same store
2. The default graph is queried. Consult your store so that the [union graph](https://patterns.dataincubator.org/book/union-graph.html) is used as the active dataset

See below for more details. 

### Examples

Check the [examples](./examples/acls.ru) file for various instances of `acl:Autorization` resources. 

## hydra-box-web-access-control

Protects [Hydra APIs](http://www.hydra-cg.com/spec/latest/core/) running [hydra-box](https://npm.im/hydra-box).

Instances of `hydra:Operation` can be annotated with a `acl:mode` property to force this access mode being checked:

```turtle
@prefix acl: <http://www.w3.org/ns/auth/acl#> .
@prefix hydra: <http://www.w3.org/ns/hydra/core#> .

[
  a hydra:Operation ;
  hydra:method "POST" ;
  acl:mode acl:Write ;
] .
``` 

If not explicitly stated, the HTTP method will be mapped:

| method | access mode |
| -- | -- |
| `GET` | `acl:Read` |
| `HEAD` | `acl:Read` |
| `OPTIONS` | `acl:Read` |
| `POST` | `acl:Write` |
| `PUT` | `acl:Write` |
| `PATCH` | `acl:Write` |
| `DELETE` | `acl:Write` |

### Setup

The setup requires creating an express middleware by providing a SPARQL client instance ([sparql-http-client](https://npm.im/sparql-http-client)), and a function to get the current user's (agent's) Graph Pointer.

```typescript
import express from 'express'
import clownface from 'clownface'
import $rdf from 'rdf-ext'
import { rdf, acl } from '@tpluscode/rdf-ns-builders'
import SparqlClient from 'sparql-http-client'
import * as hydraBox from 'hydra-box'
import accessControl from 'hydra-box-web-access-control' 
 
const app = express()

const client = new SparqlClient({
  endpoint: 'http://query.example.com/sparql'
})

// assume that there is an earlier middleware
// which creates the agent resource
app.use((req, res, next) => {
  // in this example it creates a user by hand, 
  // from info provided by express-basic-auth.
  // typically, would load from a store
  req.agent = clownface({ dataset: $rdf.dataset() })
    .namedNode(`urn:user:${req.auth.user}`)
    .addOut(rdf.type, acl.AuthenticatedAgent)
  
  next()
})

// the middleware will access req.agent to get its URI and RDF types
// it needs to be configured as a hydra-box resource middleware
app.use(hydraBox.middleware(api, {
  middleware: {
    resource: [
      accessControl({ client })
    ]
  }
}))
```

### Per-request authorization restrictions

A function of array of functions can be optionally passed to the middleware. They take an RDF/JS variable, and the current request object as parameters and should return additional SPARQL patterns to filter out ACL authorization resources as desired.

```typescript
import accessControl from 'hydra-box-web-access-control'
import { Variable } from '@rdfjs/types'
import { Request } from 'express'

const middleware =  accessControl({ 
    client,
    additionalPatterns(acl: Variable, req: Request) {
        // ...
    }
 })
```

See [below](#additional-authorization-restrictions) for a complete example. The only difference is that the `hydra-box-web-access-control` adds the second parameter while the other accepts only one.

## rdf-web-access-control

The underlying library used by `hydra-box-web-access-control` middleware.

### Check user access to resource

```typescript
import { check } from 'rdf-web-access-control'

const hasAccess: boolean = await check({
  accessMode,         // subclass of acl:Access, such as acl:Read or acl:Write
  agent,              // agent Graph Pointer
  term,               // resource URI
  client,             // sparql-http-client
  additionalPatterns, // function(s) to add more filters
})
```

For the given agent `<A>` and (optionally) resource `<R>`, it will prepare and execute a SPARQL query, looking for any instances of `acl:Authorization` which satisfy one of possible combinations:

1. Direct access grant
   - `[ acl:agent <A> ; acl:accessTo <R> ]`
2. Direct grant for class of agents
   - `[ acl:agent ?typeofAgentA ; acl:accessTo <R> ]`
3. Access granted to class of resources
   - `[ acl:agent <A> ; acl:accessTo ?typeofResourceR ]`
4. Access granted to class of resources for class of agents
   - `[ acl:agent ?typeofAgentA ; acl:accessTo ?typeofResourceR ]`
5. Agent owns resource
   - `<R> ac:owner <A>`
   
### Check user access to type of resource

Alternatively, if no specific resource is given, it is possible provide the RDF types instead of an identifier. Such would be the case when creating new resources.

```typescript
import { check } from 'rdf-web-access-control'

const hasAccess: boolean = await check({
  accessMode, // subclass of acl:Access, such as acl:Read or acl:Write
  agent,      // agent Graph Pointer
  types,      // array of RDF types
  client,     // sparql-http-client
})
```

This will only query for `acl:Authorization` using `acl:accessToClass`.

### Controling access

All queries will include add `acl:Control` mode so that it grants automatic access to the otherwise specified resource/agent combinations.

All queries will include checks for `foaf:Agent` and `acl:AuthenticatedUser` to allow creating ACL entries for anonymous users and any authenticated users respectively.

All queries will implicitly add `rdfs:Resource` to the queries types. Given a store with inferencing capabilities and the use of `rdfs:subClassOf rdfs:Resource`, it would be possible to have an ACL entry such, that it grants access to "any resource".

```turtle
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix acl: <http://www.w3.org/ns/auth/acl#> .

# Any authenticated user has read access to any resource
<>
  a acl:Authorization ;
  acl:mode acl:Read ;
  acl:agentClass acl:AuthenticatedAgent ;
  acl:accessToClass rdfs:Resource ;
.
```


### Custom authorization checks

By default, the authorization will only occur using the `acl:agent` and `acl:agentClass` properties. Both or those strategies only use information provided by the caller, thus not impacting the query greatly.

To provide more alternative ways to authorize agents, use the `additionalChecks` argument, by providing an array of functions which must return SPARQL pattern template or a RDF/JS Dataset with pattern triples.

As an example, below is the implementation of using `acl:agentGroup`. It can be imported from `rdf-web-access-control/checks`

```typescript
import { sparql } from '@tpluscode/sparql-builder'
import { acl, vcard } from '@tpluscode/rdf-ns-builders/strict'
import type { AuthorizationPatterns } from 'rdf-web-access-control'

export const agentGroup: AuthorizationPatterns = ({ agent, authorization }) => {
  return sparql`${authorization} ${acl.agentGroup}/${vcard.hasMember} ${agent} .`
}
```

### Additional authorization restrictions

It is possible to restrict considered instances of `acl:Authorization`, for example to select only ACLs valid for given timeframe or by a custom property.

Every one of the "additional patterns" will be applied to every check, ie. `acl:agent`, `acl:agentClass` and the optional `additionalChecks` described above.

To do that, pass a function to the `check` call, which will return partial SPARQL patterns. It takes an RDF/JS Variable object as input which will match the ACL resources in the query.

```typescript
import { Variable } from '@rdfjs/types'
import { schema } from '@tpluscode/rdf-ns-builders'
import { sparql } from '@tpluscode/sparql-builder'
import { toRdf } from 'rdf-literal'
import { check } from 'rdf-web-access-control' 

const hasAccess: boolean = check({
  additionalPatterns(acl: Variable) {
    return sparql`
      ${acl} ${schema.validThrough} ?validThrough .
      FILTER( ?validThrough >= ${toRdf(new Date())})
    `
  }
})
```

It is also possible to pass an array of multiple such SPARQL-building functions.

Similar applies to configuring the `hydra-box-web-access-control` middleware.
