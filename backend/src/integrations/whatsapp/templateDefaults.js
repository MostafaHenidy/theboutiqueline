/** @typedef {{ enabled: boolean, templateName: string, language: string, bodyVariables: string[] }} StatusTemplate */

const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];

const DEFAULT_VARS = {
  pending: ['order_number', 'customer_name', 'total', 'currency'],
  confirmed: ['order_number', 'customer_name', 'status_label', 'total'],
  processing: ['order_number', 'customer_name', 'status_label'],
  shipped: ['order_number', 'customer_name', 'tracking_number', 'status_label'],
  delivered: ['order_number', 'customer_name', 'status_label'],
  cancelled: ['order_number', 'customer_name', 'status_label'],
  refunded: ['order_number', 'customer_name', 'status_label'],
};

function getDefaultTemplateConfig() {
  /** @type {Record<string, StatusTemplate>} */
  const out = {};
  for (const s of ORDER_STATUSES) {
    out[s] = {
      enabled: false,
      templateName: '',
      language: 'ar',
      bodyVariables: [...(DEFAULT_VARS[s] || ['order_number', 'customer_name'])],
    };
  }
  return out;
}

function mergeTemplateConfig(incoming) {
  const base = getDefaultTemplateConfig();
  if (!incoming || typeof incoming !== 'object') return base;
  const out = { ...base };
  for (const k of ORDER_STATUSES) {
    const inc = incoming[k];
    if (inc && typeof inc === 'object') {
      // Explicit [] must persist (templates with no {{n}} placeholders); empty is not «fall back to defaults».
      let bodyVariables = base[k].bodyVariables;
      if (Array.isArray(inc.bodyVariables)) {
        bodyVariables = inc.bodyVariables.map((x) => String(x).trim()).filter(Boolean);
      }
      out[k] = {
        enabled: Boolean(inc.enabled),
        templateName: String(inc.templateName || '').trim(),
        language: String(inc.language || 'ar').trim() || 'ar',
        bodyVariables,
      };
    }
  }
  return out;
}

module.exports = {
  ORDER_STATUSES,
  getDefaultTemplateConfig,
  mergeTemplateConfig,
};
