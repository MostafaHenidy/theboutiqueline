const https = require('https');
const { URL } = require('url');

/**
 * HTTPS POST helper with timeouts (no native fetch dependency on older Node).
 * @returns {Promise<{ status: number, body: string, headers: import('http').IncomingHttpHeaders }>}
 */
exports.postHttps = ({ url, bodyObj, headers = {}, timeoutMs = 20000 }) => {
  const u = new URL(url);
  const data = typeof bodyObj === 'string' ? bodyObj : JSON.stringify(bodyObj);
  const h = {
    'Content-Type': headers['Content-Type'] || headers['content-type'] || 'application/json',
    'Content-Length': Buffer.byteLength(data),
    'User-Agent': 'MiskWear-Marketing-Integrations/1.0',
    ...headers,
  };

  return new Promise((resolve, reject) => {
    const opts = {
      hostname: u.hostname,
      port: u.port || 443,
      path: `${u.pathname}${u.search}`,
      method: 'POST',
      headers: h,
    };

    let settled = false;
    /** @type {import('http').ClientRequest|null} */
    let req = null;

    const finalize = () => clearTimeout(timer);

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try {
        req?.destroy(new Error(`Request timeout (${timeoutMs}ms)`));
      } catch {
        //
      }
    }, timeoutMs);

    req = https.request(opts, (res) => {
      let chunks = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { chunks += chunk; });
      res.on('end', () => {
        if (settled) return;
        settled = true;
        finalize();
        resolve({ status: res.statusCode || 0, body: chunks, headers: res.headers });
      });
    });

    req.on('error', (err) => {
      if (settled) return;
      settled = true;
      finalize();
      reject(err);
    });

    req.write(data);
    req.end();
  });
};
