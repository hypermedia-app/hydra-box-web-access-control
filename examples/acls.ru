base <http://example.com/>
prefix acl: <http://www.w3.org/ns/auth/acl#>
PREFIX schema: <http://schema.org/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

INSERT DATA {
graph <urn:acl:leonard-reads-penny> {
  <urn:acl:leonard-reads-penny>
    a acl:Authorization ;
    acl:mode acl:Write ;
    acl:accessTo <Penny> ;
    acl:agent <Leonard>
  .
}

graph <urn:acl:sheldon-reads-organizations> {
  <urn:acl:sheldon-reads-organizations>
    a acl:Authorization ;
    acl:mode acl:Read ;
    acl:accessToClass schema:Organization ;
    acl:agent <Sheldon>
  .
}

graph <urn:acl:anonymous-reads-creative-works> {
  <urn:acl:anonymous-reads-creative-works>
    a acl:Authorization ;
    acl:mode acl:Read ;
    acl:accessToClass schema:CreativeWork ;
    acl:agentClass foaf:Agent
  .
}

graph <urn:acl:emplyees-write-comments> {
  <urn:acl:emplyees-write-comments>
    a acl:Authorization ;
    acl:mode acl:Write ;
    acl:accessToClass schema:Comment ;
    acl:agentClass schema:Employee
  .
}

graph <urn:acl:howard-write-articles> {
  <urn:acl:howard-write-articles>
    a acl:Authorization ;
    acl:mode acl:Write ;
    acl:accessToClass schema:ScholarlyArticle ;
    acl:agent <Howard>
  .
}
}
