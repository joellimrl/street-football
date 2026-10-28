class HttpError extends Error {
  constructor(status) { super(`HTTP ${status}`); this.status = status; }
}
async function requestJson(url, { headers = {}, fetchImpl = fetch, sleep = ms => new Promise(r => setTimeout(r, ms)), maxBytes = 2 * 1024 * 1024, beforeAttempt = () => {} } = {}) {
  for (let attempt = 0; attempt < 3; attempt++) {
    beforeAttempt();
    let response;
    try {
      response = await fetchImpl(url, { headers: { Accept: 'application/json', 'User-Agent': 'StreetFootball/1.0', ...headers },
        signal: AbortSignal.timeout(15000), redirect: 'error' });
    } catch {
      if (attempt === 2) throw new Error('Network request failed');
      await sleep(1000 * 2 ** attempt); continue;
    }
    if (!response.ok) {
      await response.body?.cancel();
      const retry = response.status === 429 || response.status >= 500;
      const hint = response.headers.get('retry-after');
      const retryMs = hint === null ? 1000 * 2 ** attempt : /^\d+$/.test(hint) ? Number(hint) * 1000 : Math.max(0, Date.parse(hint) - Date.now());
      if (!retry || attempt === 2 || !Number.isFinite(retryMs) || retryMs > 30000) throw new HttpError(response.status);
      await sleep(Math.max(1000, retryMs)); continue;
    }
    if (Number(response.headers.get('content-length')) > maxBytes) { await response.body?.cancel(); throw new Error('Response too large'); }
    const reader = response.body.getReader(); const chunks = []; let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        size += value.byteLength;
        if (size > maxBytes) { await reader.cancel(); throw new Error('Response too large'); }
        chunks.push(Buffer.from(value));
      }
    } catch (error) {
      if (error.message === 'Response too large') throw error;
      throw new Error('Response read failed');
    }
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { throw new Error('Invalid JSON response'); }
  }
}
module.exports = { requestJson, HttpError };
