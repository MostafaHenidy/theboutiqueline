/**
 * Meta WhatsApp Cloud API — send template messages.
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages
 */

async function graphGet(version, resourcePath, accessToken) {
  const path = resourcePath.startsWith('/') ? resourcePath.slice(1) : resourcePath;
  const url = `https://graph.facebook.com/${version}/${path}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json.error?.message || JSON.stringify(json) || res.statusText;
    const err = new Error(msg);
    err.meta = json;
    if (json.error && typeof json.error === 'object') {
      err.fbError = json.error;
    }
    throw err;
  }
  return json;
}

/**
 * Normalize language payload from GET /message_templates (string or `{ code }`).
 */
function parseTemplateLanguageField(langRaw) {
  if (langRaw == null) return '';
  if (typeof langRaw === 'string') return langRaw.trim();
  if (typeof langRaw === 'object' && langRaw !== null && !Array.isArray(langRaw) && langRaw.code != null) {
    return String(langRaw.code).trim();
  }
  return String(langRaw).trim();
}

/** Compare template locale from admin vs Graph (trim, hyphen → underscore). */
function normalizeLangComparable(code) {
  return String(code ?? '').trim().replace(/-/g, '_');
}

function maxNumericPlaceholderDepthInText(text) {
  const s = text != null ? String(text) : '';
  if (!s) return 0;
  const re = /\{\{\s*(\d+)\s*\}\}/g;
  let m;
  let max = 0;
  while ((m = re.exec(s)) !== null) {
    const n = parseInt(m[1], 10);
    if (!Number.isNaN(n)) max = Math.max(max, n);
  }
  return max;
}

/** Max {{n}} index in BODY component (0 = no body variables). */
function maxBodyNumericPlaceholderDepth(components) {
  const body = Array.isArray(components)
    ? components.find((c) => String(c?.type || '').toUpperCase() === 'BODY')
    : null;
  return maxNumericPlaceholderDepthInText(body?.text);
}

/** HEADER TEXT format only; IMAGE/VIDEO headers have no {{n}} in `text` the same way. */
function maxHeaderNumericPlaceholderDepth(components) {
  const h = Array.isArray(components)
    ? components.find((c) => String(c?.type || '').toUpperCase() === 'HEADER')
    : null;
  if (!h) return 0;
  const fmt = String(h.format || 'TEXT').toUpperCase();
  if (fmt !== 'TEXT') return 0;
  return maxNumericPlaceholderDepthInText(h.text);
}

/**
 * Fetch `components` for an approved template row (name + language).
 * Uses Graph `name` filter on message_templates.
 */
async function fetchApprovedTemplateComponents(version, wabaId, accessToken, templateName, languageCode) {
  const vid = String(version || 'v21.0').replace(/^\/*/, '').trim();
  const waba = String(wabaId || '').trim();
  const wantName = String(templateName || '').trim();
  const wantLang = normalizeLangComparable(languageCode);
  if (!waba || !wantName || !wantLang) return null;

  const qs = new URLSearchParams({
    fields: 'name,language,components,status',
    limit: '30',
    name: wantName,
  });
  const json = await graphGet(vid, `${waba}/message_templates?${qs}`, accessToken);
  const rows = Array.isArray(json?.data) ? json.data : [];
  let row = rows.find((r) => {
    const st = String(r.status || '').toUpperCase();
    const ln = normalizeLangComparable(parseTemplateLanguageField(r.language));
    return st === 'APPROVED' && ln === wantLang && String(r.name || '').trim() === wantName;
  });
  if (!row) {
    row = rows.find((r) => {
      const ln = normalizeLangComparable(parseTemplateLanguageField(r.language));
      return ln === wantLang && String(r.name || '').trim() === wantName;
    });
  }
  if (!row || !Array.isArray(row.components)) return null;
  return row.components;
}

/**
 * List APPROVED message templates under a WhatsApp Business Account.
 * @returns {Promise<{ name: string, language: string, category: string }[]>}
 */
async function listApprovedMessageTemplates(version, wabaId, accessToken) {
  const vid = String(version || 'v21.0').replace(/^\/*/, '').trim();
  const waba = String(wabaId || '').trim();
  if (!waba) throw new Error('Missing WhatsApp Business Account ID');
  const out = [];
  let afterCursor = '';
  let pages = 0;
  while (pages++ < 30) {
    const qs = new URLSearchParams({
      fields: 'name,status,language,category',
      limit: '100',
    });
    if (afterCursor) qs.set('after', afterCursor);
    const json = await graphGet(vid, `${waba}/message_templates?${qs}`, accessToken);
    const chunk = Array.isArray(json?.data) ? json.data : [];
    for (const t of chunk) {
      const st = String(t.status || '').toUpperCase();
      if (st !== 'APPROVED') continue;
      const language = parseTemplateLanguageField(t.language);
      const name = String(t.name || '').trim();
      if (!name || !language) continue;
      out.push({
        name,
        language,
        category: t.category != null ? String(t.category) : '',
      });
    }
    afterCursor = json?.paging?.cursors?.after || '';
    if (!afterCursor || chunk.length === 0) break;
  }
  out.sort((a, b) => `${a.name}|${a.language}`.localeCompare(`${b.name}|${b.language}`));
  return out;
}

async function graphPost(version, phoneNumberId, accessToken, body) {
  const url = `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json.error?.message || JSON.stringify(json) || res.statusText;
    const err = new Error(msg);
    err.meta = json;
    if (json.error && typeof json.error === 'object') {
      err.fbError = json.error;
    }
    throw err;
  }
  return json;
}

/**
 * @param {object} opts
 * @param {string} opts.version e.g. v21.0
 * @param {string} opts.phoneNumberId
 * @param {string} opts.accessToken
 * @param {string} opts.to E.164 without +
 * @param {string} opts.templateName
 * @param {string} opts.languageCode e.g. ar, en_US
 * @param {string[]} opts.bodyTexts ordered body {{1}}, {{2}} …
 */
async function sendWhatsAppTemplate({
  version,
  phoneNumberId,
  accessToken,
  to,
  templateName,
  languageCode,
  bodyTexts,
}) {
  const components = [];
  if (bodyTexts?.length) {
    components.push({
      type: 'body',
      parameters: bodyTexts.map((text) => ({ type: 'text', text: String(text).slice(0, 1024) })),
    });
  }

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      ...(components.length ? { components } : {}),
    },
  };

  return graphPost(version, phoneNumberId, accessToken, payload);
}

async function testWhatsAppCredentials(version, phoneNumberId, accessToken) {
  return graphGet(version, `${phoneNumberId}?fields=id,display_phone_number,verified_name`, accessToken);
}

module.exports = {
  sendWhatsAppTemplate,
  testWhatsAppCredentials,
  listApprovedMessageTemplates,
  parseTemplateLanguageField,
  normalizeLangComparable,
  maxBodyNumericPlaceholderDepth,
  maxHeaderNumericPlaceholderDepth,
  fetchApprovedTemplateComponents,
};
