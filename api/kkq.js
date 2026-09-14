const VERIFIED_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwfaj-k6MD3CZwJnX2tfvAmtu_tU0jCgZKEhXCX9njC7K2XKniH6HhPtfWW96PdXaHE/exec';
const DEFAULT_APPS_SCRIPT_URL = VERIFIED_APPS_SCRIPT_URL;

function json(res, status, body) {
  res.status(status)
    .setHeader('Content-Type', 'application/json; charset=utf-8')
    .setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

async function callAppsScript(endpoint, payload) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload),
    redirect: 'follow'
  });
  const text = await response.text();
  try {
    return {response, body: JSON.parse(text)};
  } catch {
    return {response, text};
  }
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    json(res, 405, {ok: false, error: 'Kaedah permintaan tidak disokong.'});
    return;
  }

  if (!DEFAULT_APPS_SCRIPT_URL) {
    json(res, 500, {
      ok: false,
      error: 'SMART_KKQ_APPS_SCRIPT_URL belum dikonfigurasi di Vercel.'
    });
    return;
  }

  try {
    const endpoint = new URL(DEFAULT_APPS_SCRIPT_URL);
    if (endpoint.protocol !== 'https:') {
      json(res, 500, {ok: false, error: 'SMART_KKQ_APPS_SCRIPT_URL mesti menggunakan HTTPS.'});
      return;
    }
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    let result = await callAppsScript(DEFAULT_APPS_SCRIPT_URL, payload);

    if (!result.body && DEFAULT_APPS_SCRIPT_URL !== VERIFIED_APPS_SCRIPT_URL) {
      result = await callAppsScript(VERIFIED_APPS_SCRIPT_URL, payload);
    }

    const response = result.response;
    const body = result.body || {
      ok: false,
      error: `Respons Apps Script bukan JSON yang sah (HTTP ${response.status}). URL deployment mungkin memerlukan akses "Anyone".`
    };
    if (!response.ok) {
      json(res, response.status, body);
      return;
    }

    json(res, 200, body);
  } catch (error) {
    console.error('Apps Script proxy error:', error);
    json(res, 502, {ok: false, error: 'Tidak dapat menyambung ke Apps Script.'});
  }
};
