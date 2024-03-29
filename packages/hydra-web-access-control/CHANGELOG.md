# hydra-box-web-access-control

## 1.2.1

### Patch Changes

- ba9e549: Updated `@tpluscode/rdf-ns-builders` to v2
- Updated dependencies [ba9e549]
  - rdf-web-access-control@1.3.2

## 1.2.0

### Minor Changes

- 5d51eed: False-negative authorization result in cases when the hydra-box `ResourceLoader` choose a resource with different identifier than the request URL

### Patch Changes

- Updated dependencies [5d51eed]
  - rdf-web-access-control@1.3.0

## 1.1.5

### Patch Changes

- e80dafa: fixes [DEP0128] DeprecationWarning: Invalid 'main' field
- Updated dependencies [e80dafa]
  - rdf-web-access-control@1.2.3

## 1.1.4

### Patch Changes

- 0495d3f: `lib` dir was missing from built package
- Updated dependencies [0495d3f]
  - rdf-web-access-control@1.2.2

## 1.1.3

### Patch Changes

- 4ebbb90: Forward additional checks to `rdf-web-access-control`

## 1.1.2

### Patch Changes

- 5f3621b: Response should be 401 when the is no authenticated agent

## 1.1.1

### Patch Changes

- bef021d: Add express `Request` as second parameter to custom patterns

## 1.1.0

### Minor Changes

- bf0bee8: Add option to provide additional patterns to further restrict authorization

### Patch Changes

- c08bf90: Use new RDF/JS types
- Updated dependencies [bf0bee8]
- Updated dependencies [c08bf90]
  - rdf-web-access-control@1.1.0

## 1.0.0

### Major Changes

- ffd7f12: First version

### Patch Changes

- Updated dependencies [ffd7f12]
  - rdf-web-access-control@1.0.0
