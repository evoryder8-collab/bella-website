// Resolves a dotted key such as "treatments.items.0.name" against a copy object.
export function lookup(strings, key) {
  return key.split('.').reduce((node, part) => (node == null ? undefined : node[part]), strings);
}
