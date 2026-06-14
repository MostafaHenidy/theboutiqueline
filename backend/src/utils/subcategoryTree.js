/**
 * Build nested subcategory trees from flat rows.
 * @param {Array<object>} flatRows
 * @returns {Array<object>}
 */
function buildSubcategoryTree(flatRows) {
  const rows = (flatRows || []).map((r) => {
    const plain = typeof r.toJSON === 'function' ? r.toJSON() : { ...r };
    return { ...plain, children: [] };
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  const roots = [];

  for (const row of rows) {
    const parentId = row.parent_id ?? null;
    if (parentId && byId.has(parentId)) {
      byId.get(parentId).children.push(row);
    } else {
      roots.push(row);
    }
  }

  const sortNodes = (nodes) => {
    nodes.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id);
    nodes.forEach((n) => sortNodes(n.children));
  };
  sortNodes(roots);
  return roots;
}

/**
 * Collect all descendant IDs (excluding self unless includeSelf).
 */
function collectDescendantIds(flatRows, subcategoryId, includeSelf = true) {
  const id = parseInt(subcategoryId, 10);
  if (!Number.isFinite(id)) return [];

  const childrenByParent = new Map();
  for (const row of flatRows || []) {
    const plain = typeof row.toJSON === 'function' ? row.toJSON() : row;
    const pid = plain.parent_id ?? null;
    if (!childrenByParent.has(pid)) childrenByParent.set(pid, []);
    childrenByParent.get(pid).push(plain.id);
  }

  const out = includeSelf ? [id] : [];
  const stack = [...(childrenByParent.get(id) || [])];
  while (stack.length) {
    const cur = stack.pop();
    out.push(cur);
    const kids = childrenByParent.get(cur);
    if (kids?.length) stack.push(...kids);
  }
  return out;
}

function countTreeNodes(nodes) {
  if (!nodes?.length) return 0;
  return nodes.reduce((sum, n) => sum + 1 + countTreeNodes(n.children), 0);
}

/**
 * Validate parent assignment — same category, no cycles.
 */
async function validateParentAssignment({ Subcategory, category_id, parent_id, subcategoryId }) {
  const parentId = parent_id != null && parent_id !== '' ? parseInt(parent_id, 10) : null;
  const catId = parseInt(category_id, 10);

  if (parentId) {
    const parent = await Subcategory.findByPk(parentId);
    if (!parent) {
      const err = new Error('Parent subcategory not found');
      err.status = 400;
      throw err;
    }
    if (parent.category_id !== catId) {
      const err = new Error('Parent must belong to the same category');
      err.status = 400;
      throw err;
    }
    if (subcategoryId && parentId === subcategoryId) {
      const err = new Error('Subcategory cannot be its own parent');
      err.status = 400;
      throw err;
    }
    if (subcategoryId) {
      const all = await Subcategory.findAll({ attributes: ['id', 'parent_id'] });
      const descendants = collectDescendantIds(all, subcategoryId, false);
      if (descendants.includes(parentId)) {
        const err = new Error('Cannot move subcategory under its own descendant');
        err.status = 400;
        throw err;
      }
    }
  }

  return { parent_id: parentId || null, category_id: catId };
}

module.exports = {
  buildSubcategoryTree,
  collectDescendantIds,
  countTreeNodes,
  validateParentAssignment,
};
