const dns = require('dns').promises;
const crypto = require('crypto');

const TXT_PREFIX = 'misk-site-verify=';

function normalizeDomain(input) {
  if (input == null || typeof input !== 'string') return '';
  let s = input.trim().toLowerCase();
  s = s.replace(/^https?:\/\//, '');
  s = s.split('/')[0].split(':')[0].replace(/\.$/, '');
  return s;
}

const { resolveStorefrontBaseUrl, parseFrontendUrlCandidates } = require('../utils/storefrontUrl');

function inferHostFromFrontendUrl() {
  const picked = resolveStorefrontBaseUrl();
  try {
    const h = new URL(picked).hostname;
    if (h && h !== 'localhost' && h !== '127.0.0.1' && !h.endsWith('.local')) return h;
  } catch { /* ignore */ }
  const candidates = parseFrontendUrlCandidates(process.env.FRONTEND_URL || '');
  for (const url of candidates) {
    try {
      const h = new URL(url).hostname;
      if (h && h !== 'localhost' && h !== '127.0.0.1' && !h.endsWith('.local')) return h;
    } catch { /* next */ }
  }
  return '';
}

function buildDnsHints() {
  const cnameTarget = (process.env.DOMAIN_DNS_CNAME_TARGET || '').trim() || inferHostFromFrontendUrl();
  const aRecord = (process.env.DOMAIN_DNS_A_RECORD || '').trim();
  return {
    cname_target: cnameTarget,
    a_record: aRecord,
    txt_name_suffix: '_misk-site-verification',
    txt_value_prefix: TXT_PREFIX,
  };
}

function hostMatchesExpected(value, expected) {
  if (!value || !expected) return false;
  const v = String(value).toLowerCase().replace(/\.$/, '');
  const e = String(expected).toLowerCase().replace(/\.$/, '');
  return v === e || v.endsWith(`.${e}`);
}

/**
 * @returns {Promise<{ checks: Array<{ id: string, ok: boolean | null, label_ar: string, label_en: string, detail: string }>, status: string, error: string }>}
 */
async function verifyDomainDns(hostname, token, hints = buildDnsHints()) {
  const checks = [];
  const domain = normalizeDomain(hostname);
  if (!domain || !token) {
    return {
      status: 'none',
      checks: [],
      error: 'missing_domain_or_token',
    };
  }

  const txtFqdn = `${hints.txt_name_suffix}.${domain}`;
  let txtOk = false;
  let txtDetail = '';
  try {
    const rows = await dns.resolveTxt(txtFqdn);
    const flat = rows.map((chunk) => (Array.isArray(chunk) ? chunk.join('') : String(chunk))).join('');
    txtOk = flat.includes(`${TXT_PREFIX}${token}`);
    txtDetail = txtOk ? 'OK' : 'Record not found or value mismatch';
  } catch (e) {
    txtDetail = e.code || e.message || 'TXT lookup failed';
  }
  checks.push({
    id: 'txt',
    ok: txtOk,
    label_ar: 'سجل TXT للتحقق',
    label_en: 'TXT verification record',
    detail: txtDetail,
  });

  const targetHost = hints.cname_target;
  const targetIp = hints.a_record;
  const routingConfigured = !!(targetHost || targetIp);

  let routingOk = null;
  let routingDetail = routingConfigured ? 'No match yet' : 'Skipped (set DOMAIN_DNS_CNAME_TARGET or DOMAIN_DNS_A_RECORD in .env)';

  if (routingConfigured) {
    routingOk = false;
    try {
      const cnames = await dns.resolveCname(domain);
      if (cnames?.length && targetHost) {
        routingOk = cnames.some((h) => hostMatchesExpected(h, targetHost));
        routingDetail = `CNAME → ${cnames.join(', ')}`;
      }
    } catch { /* ENODATA / ENOTFOUND */ }

    if (!routingOk && targetIp) {
      try {
        const ips = await dns.resolve4(domain);
        routingOk = ips.includes(targetIp);
        routingDetail = `A → ${ips.join(', ')}`;
      } catch { /* try next */ }
    }

    if (!routingOk && targetHost) {
      try {
        const ips = await dns.resolve4(domain);
        const targetIps = await dns.resolve4(targetHost).catch(() => []);
        routingOk = targetIps.length > 0 && ips.some((ip) => targetIps.includes(ip));
        if (routingDetail.startsWith('A →')) {
          /* keep */
        } else routingDetail = `A → ${ips.join(', ')} (compare to ${targetHost})`;
      } catch (e) {
        routingDetail = e.code || routingDetail;
      }
    }

    checks.push({
      id: 'routing',
      ok: routingOk,
      label_ar: 'توجيه الدومين (CNAME / A)',
      label_en: 'Domain routing (CNAME / A)',
      detail: routingDetail,
    });
  }

  const routingPass = !routingConfigured || routingOk === true;
  const status = txtOk && routingPass ? 'verified' : 'pending';

  return {
    status,
    checks,
    error: status === 'verified' ? '' : 'verification_incomplete',
  };
}

function newVerificationToken() {
  return crypto.randomBytes(24).toString('hex');
}

module.exports = {
  normalizeDomain,
  buildDnsHints,
  verifyDomainDns,
  newVerificationToken,
  TXT_PREFIX,
};
