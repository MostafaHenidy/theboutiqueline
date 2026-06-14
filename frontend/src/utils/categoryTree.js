import { getCategoryName } from './helpers';

export function countSubcategoryNodes(nodes) {
  if (!nodes?.length) return 0;
  return nodes.reduce((sum, n) => sum + 1 + countSubcategoryNodes(n.children), 0);
}

export function flattenSubcategoryOptions(nodes, language = 'en', depth = 0) {
  if (!nodes?.length) return [];
  const out = [];
  for (const node of nodes) {
    const prefix = depth > 0 ? `${'— '.repeat(depth)}` : '';
    const name = getCategoryName(node, language);
    out.push({ id: node.id, label: `${prefix}${name}`, depth });
    if (node.children?.length) {
      out.push(...flattenSubcategoryOptions(node.children, language, depth + 1));
    }
  }
  return out;
}

/** Collect all subcategory IDs in a branch (for UI expand state). */
export function collectSubcategoryIds(nodes) {
  if (!nodes?.length) return [];
  const ids = [];
  const walk = (list) => {
    for (const n of list) {
      ids.push(n.id);
      if (n.children?.length) walk(n.children);
    }
  };
  walk(nodes);
  return ids;
}
