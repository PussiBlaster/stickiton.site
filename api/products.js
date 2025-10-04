// api/products.js — Vercel Serverless Function using KV REST
export default async function handler(req, res) {
  const { KV_REST_API_URL, KV_REST_API_TOKEN, ADMIN_SYNC_SECRET } = process.env;
  if (!KV_REST_API_URL || !KV_REST_API_TOKEN) return respond(res, 500, { error: "KV not configured" });
  try {
    if (req.method === "OPTIONS") return respond(res, 204);
    if (req.method === "GET") { const products = await kvGet("products"); return respond(res, 200, { products }); }
    if (req.method === "POST") {
      const secret = req.headers["x-admin-secret"];
      if (!ADMIN_SYNC_SECRET || secret !== ADMIN_SYNC_SECRET) return respond(res, 401, { error: "Unauthorized" });
      const body = await readJson(req);
      const list = Array.isArray(body?.products) ? body.products : [];
      const fixed = list.map(p => { const imgs = Array.isArray(p.imgs) ? p.imgs.slice(0,5) : (p.img ? [p.img] : []); return { ...p, imgs, img: imgs[0] || "" }; });
      await kvSet("products", fixed);
      return respond(res, 200, { ok: true, count: fixed.length });
    }
    return respond(res, 405, { error: "Method Not Allowed" });
  } catch (e) { return respond(res, 500, { error: String(e?.message || e) }); }

  async function kvGet(key){
    const r = await fetch(`${KV_REST_API_URL}/get/${encodeURIComponent(key)}`, { headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` }, cache: "no-store" });
    if (!r.ok) return [];
    const data = await r.json();
    if (!data || typeof data.result === "undefined" || data.result === null) return [];
    try { return JSON.parse(data.result); } catch { return []; }
  }
  async function kvSet(key, value){
    const r = await fetch(`${KV_REST_API_URL}/set/${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ value: JSON.stringify(value) })
    });
    if (!r.ok) throw new Error(`KV set failed: ${r.status}`);
  }
  async function readJson(req){
    return new Promise((resolve)=>{ let raw=""; req.on("data",c=>raw+=c); req.on("end",()=>{ try{ resolve(JSON.parse(raw||"{}")); }catch{ resolve({}); } }); });
  }
  function respond(res, status=200, json){
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,x-admin-secret");
    res.status(status); if (status===204) return res.end();
    res.setHeader("Content-Type","application/json; charset=utf-8");
    res.end(JSON.stringify(json??{}));
  }
}