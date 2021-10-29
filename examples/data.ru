base <http://example.com/>
prefix acl: <http://www.w3.org/ns/auth/acl#>
prefix foaf: <http://xmlns.com/foaf/0.1/>
PREFIX schema: <http://schema.org/>
PREFIX vcard: <http://www.w3.org/2006/vcard/ns#>

INSERT DATA {
graph <Penny> {
  <Penny>
    a foaf:Person ;
    foaf:name "Penny" .
}

graph <Caltech> {
  <Caltech>
    a schema:Organization ;
    schema:name "Caltech"
  .
}

graph <PublicReport> {
  <PublicReport>
    a schema:CreativeWork .
}

graph <PrivateReport> {
  <PrivateReport>
    schema:name "Howard's work" ;
    acl:owner <Howard> ;
    <sharedWith> <Penny> ;
  .
}

graph <Group> {
  <Group> vcard:hasMember <Penny>
}

graph <Comment> {
  <Comment>
     a schema:Comment ;
  .
}
}
