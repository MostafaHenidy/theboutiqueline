const { WhatsAppIntegration } = require('../models');
const { encryptJson, decryptJson } = require('../integrations/cryptoSecret');
const {
  mergeTemplateConfig,
  getDefaultTemplateConfig,
} = require('../integrations/whatsapp/templateDefaults');
const { testWhatsAppCredentials, listApprovedMessageTemplates } = require('../integrations/whatsapp/metaClient');

async function getOrCreateIntegration() {
  let row = await WhatsAppIntegration.findOne({ order: [['id', 'ASC']] });
  if (!row) {
    row = await WhatsAppIntegration.create({
      enabled: false,
      graph_api_version: process.env.WHATSAPP_GRAPH_VERSION || 'v21.0',
      template_config: getDefaultTemplateConfig(),
      connection_status: 'disconnected',
    });
  }
  return row;
}

function tryDecrypt(row) {
  if (!row?.encrypted_credentials || !row.iv || !row.auth_tag) return null;
  try {
    return decryptJson(row.encrypted_credentials, row.iv, row.auth_tag);
  } catch {
    return null;
  }
}

function sanitizeRow(row) {
  const creds = tryDecrypt(row);
  return {
    id: row.id,
    enabled: Boolean(row.enabled),
    phone_number_id: row.phone_number_id || '',
    graph_api_version: row.graph_api_version || 'v21.0',
    phone_country_code: String(row.phone_country_code || '966').replace(/\D/g, '').slice(0, 15) || '966',
    whatsapp_business_account_id: row.whatsapp_business_account_id
      ? String(row.whatsapp_business_account_id).trim()
      : '',
    template_config: mergeTemplateConfig(row.template_config),
    connection_status: row.connection_status || 'disconnected',
    last_error: row.last_error || null,
    last_sent_at: row.last_sent_at || null,
    has_access_token: !!(creds && creds.accessToken && String(creds.accessToken).trim()),
  };
}

exports.getIntegration = async (req, res, next) => {
  try {
    const row = await getOrCreateIntegration();
    res.json({ success: true, data: sanitizeRow(row) });
  } catch (err) {
    next(err);
  }
};

exports.putIntegration = async (req, res, next) => {
  try {
    const row = await getOrCreateIntegration();
    const {
      enabled,
      phone_number_id,
      graph_api_version,
      phone_country_code,
      whatsapp_business_account_id,
      access_token,
      template_config,
    } = req.body || {};

    if (typeof enabled === 'boolean') row.enabled = enabled;
    if (phone_number_id !== undefined) row.phone_number_id = phone_number_id ? String(phone_number_id).trim() : null;
    if (graph_api_version !== undefined && String(graph_api_version).trim()) {
      row.graph_api_version = String(graph_api_version).trim().replace(/^\/*/, '');
    }
    if (phone_country_code !== undefined) {
      const cc = String(phone_country_code).replace(/\D/g, '').replace(/^\+/, '').slice(0, 15);
      row.phone_country_code = cc && cc.length >= 1 ? cc : '966';
    }
    if (whatsapp_business_account_id !== undefined) {
      const wid = String(whatsapp_business_account_id ?? '')
        .replace(/\D/g, '')
        .slice(0, 24);
      row.whatsapp_business_account_id = wid || null;
    }
    if (template_config !== undefined && template_config !== null && typeof template_config === 'object') {
      row.template_config = mergeTemplateConfig(template_config);
    }

    if (access_token !== undefined && typeof access_token === 'string' && access_token.trim()) {
      const prev = tryDecrypt(row) || {};
      const encrypted = encryptJson({
        ...prev,
        accessToken: access_token.trim(),
      });
      row.encrypted_credentials = encrypted.ciphertext;
      row.iv = encrypted.iv;
      row.auth_tag = encrypted.auth_tag;
    }

    await row.save();
    res.json({ success: true, data: sanitizeRow(row) });
  } catch (err) {
    next(err);
  }
};

exports.postTestConnection = async (req, res, next) => {
  try {
    const row = await getOrCreateIntegration();
    const creds = tryDecrypt(row);
    const token =
      typeof req.body?.access_token === 'string' && req.body.access_token.trim()
        ? req.body.access_token.trim()
        : creds?.accessToken;
    const phoneId = (req.body?.phone_number_id || row.phone_number_id || '').trim();
    const ver = (
      req.body?.graph_api_version ||
      row.graph_api_version ||
      'v21.0'
    )
      .toString()
      .trim()
      .replace(/^\/*/, '');
    if (!token) {
      return res.status(400).json({ success: false, message: 'Missing access token' });
    }
    if (!phoneId) {
      return res.status(400).json({ success: false, message: 'Missing WhatsApp Phone Number ID' });
    }

    try {
      const info = await testWhatsAppCredentials(ver, phoneId, token);
      row.phone_number_id = phoneId;
      row.graph_api_version = ver;
      row.connection_status = 'connected';
      row.last_error = null;
      if (typeof req.body?.access_token === 'string' && req.body.access_token.trim()) {
        const merged = encryptJson({ ...(tryDecrypt(row) || {}), accessToken: token });
        row.encrypted_credentials = merged.ciphertext;
        row.iv = merged.iv;
        row.auth_tag = merged.auth_tag;
      }
      await row.save();
      res.json({
        success: true,
        display_phone_number: info.display_phone_number,
        verified_name: info.verified_name,
        id: info.id,
        data: sanitizeRow(row),
      });
    } catch (e) {
      row.connection_status = 'error';
      row.last_error = (e.message || String(e)).slice(0, 4000);
      await row.save();
      return res.status(400).json({
        success: false,
        message: e.message || 'Connection failed',
        data: sanitizeRow(row),
      });
    }
  } catch (err) {
    next(err);
  }
};

exports.listApprovedTemplates = async (req, res) => {
  try {
    const row = await getOrCreateIntegration();
    const creds = tryDecrypt(row);
    const token = creds?.accessToken && String(creds.accessToken).trim();
    const ver = String(row.graph_api_version || 'v21.0').replace(/^\/*/, '').trim();
    const waba = String(row.whatsapp_business_account_id || '')
      .replace(/\D/g, '')
      .slice(0, 24);
    if (!token) {
      return res.status(400).json({ success: false, message: 'Save WhatsApp access token first (or test connection).' });
    }
    if (!waba) {
      return res.status(400).json({
        success: false,
        message: 'Save WhatsApp Business Account ID first (digits from Meta → API Setup).',
      });
    }
    const data = await listApprovedMessageTemplates(ver, waba, token);
    res.json({ success: true, data });
  } catch (e) {
    const msg = e.message || String(e);
    const hintPermission =
      /permission|OAuth|oauth/i.test(msg) && !/business_management/i.test(msg)
        ? ' Token may need: whatsapp_business_management (+ whatsapp_business_messaging).' : '';
    res.status(400).json({ success: false, message: `${msg}${hintPermission}` });
  }
};

exports.listApprovedTemplates = async (req, res) => {
  try {
    const row = await getOrCreateIntegration();
    const creds = tryDecrypt(row);
    const token = creds?.accessToken && String(creds.accessToken).trim();
    const ver = String(row.graph_api_version || 'v21.0').replace(/^\/*/, '').trim();
    const waba = String(row.whatsapp_business_account_id || '')
      .replace(/\D/g, '')
      .slice(0, 24);
    if (!token) {
      return res.status(400).json({ success: false, message: 'Save WhatsApp access token first (or test connection).' });
    }
    if (!waba) {
      return res.status(400).json({
        success: false,
        message: 'Save WhatsApp Business Account ID first (digits from Meta → API Setup).',
      });
    }
    const data = await listApprovedMessageTemplates(ver, waba, token);
    res.json({ success: true, data });
  } catch (e) {
    const msg = e.message || String(e);
    const hintPermission =
      /permission|OAuth|oauth/i.test(msg) && !/business_management/i.test(msg)
        ? ' Token may need: whatsapp_business_management (+ whatsapp_business_messaging).' : '';
    res.status(400).json({ success: false, message: `${msg}${hintPermission}` });
  }
};
