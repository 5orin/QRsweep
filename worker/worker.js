// Pallet QR tool — shared sync backend.
// Deploy this as a Cloudflare Worker (Workers & Pages -> your "autosync" Worker -> Edit code),
// paste this in to REPLACE the old code, then Deploy.
//
// ---- SECURITY (new) ----
// 1. Go to this Worker -> Settings -> Variables and Secrets -> Add.
//    Name: SYNC_TOKEN   Type: Secret (encrypted)   Value: a long random password you make up
//    (30+ random characters is plenty, doesn't need to be memorable since you'll paste it, not type it).
// 2. Paste that EXACT same value into the tool's "Sync token" field (next to the Worker URL box)
//    on every device. Until you set the secret, the Worker behaves exactly as before (open) —
//    so you can deploy this file first without anything breaking, then lock it down when ready.
// 3. Update ALLOWED_ORIGIN below to match your actual Pages URL if it's different.

const KEY = 'pallet-qr-state';
const EMPTY_STATE = '{"references":[],"pallets":[],"nextPal":1000000001}';
const ALLOWED_ORIGIN = 'https://qrsweep.pages.dev'; // <-- change if your Pages URL is different

export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Sync-Token',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }

    // Shared-secret check. Only enforced once you actually set the SYNC_TOKEN
    // secret in this Worker's settings (see notes above) — safe to deploy early.
    if (env.SYNC_TOKEN) {
      const provided = request.headers.get('X-Sync-Token');
      if (provided !== env.SYNC_TOKEN) {
        return new Response('{"ok":false,"error":"unauthorized"}', {
          status: 403, headers: { 'Content-Type': 'application/json', ...cors },
        });
      }
    }

    if (request.method === 'GET') {
      const data = await env.PALLET_KV.get(KEY);
      return new Response(data || EMPTY_STATE, {
        headers: { 'Content-Type': 'application/json', ...cors },
      });
    }

    if (request.method === 'POST') {
      const body = await request.text();
      // basic sanity check so a stray bad request can't corrupt the store
      try { JSON.parse(body); } catch (e) {
        return new Response('{"ok":false,"error":"invalid JSON"}', {
          status: 400, headers: { 'Content-Type': 'application/json', ...cors },
        });
      }
      await env.PALLET_KV.put(KEY, body);
      return new Response('{"ok":true}', {
        headers: { 'Content-Type': 'application/json', ...cors },
      });
    }

    return new Response('Not found', { status: 404, headers: cors });
  },
};
