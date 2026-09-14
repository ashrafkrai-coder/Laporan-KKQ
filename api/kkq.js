const DEFAULT_APPS_SCRIPT_URL = process.env.SMART_KKQ_APPS_SCRIPT_URL;

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
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
    const response = await fetch(DEFAULT_APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {})
    });
    const text = await response.text();
    let body;

    try {
      body = JSON.parse(text);
    } catch {
      body = {ok: false, error: 'Respons Apps Script bukan JSON yang sah.'};
    }

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
