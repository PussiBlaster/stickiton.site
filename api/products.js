
export default async function handler(req, res) {
  const token  = process.env.GH_TOKEN;
  const owner  = process.env.GH_OWNER;
  const repo   = process.env.GH_REPO;
  const branch = process.env.GH_BRANCH || "main";
  const path   = process.env.GH_FILE || "products.json";

  if(!token || !owner || !repo){
    return res.status(500).json({ ok:false, error: "Missing GH_* env vars" });
  }

  const baseUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;

  async function getFile() {
    const r = await fetch(`${baseUrl}?ref=${branch}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Accept": "application/vnd.github+json"
      }
    });
    if (!r.ok) throw new Error(`GET ${r.status}`);
    return r.json();
  }

  async function putFile(contentB64, sha) {
    const r = await fetch(baseUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "Update products.json via admin panel",
        content: contentB64,
        sha,
        branch
      })
    });
    if (!r.ok) throw new Error(`PUT ${r.status}`);
    return r.json();
  }

  try {
    if (req.method === "GET") {
      const file = await getFile();
      const json = JSON.parse(Buffer.from(file.content, "base64").toString("utf8"));
      return res.status(200).json({ ok: true, products: json, sha: file.sha });
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const { products } = body || {};
      if(!Array.isArray(products)) return res.status(400).json({ ok:false, error: "Invalid payload" });
      const file = await getFile();
      const contentB64 = Buffer.from(JSON.stringify(products, null, 2)).toString("base64");
      const r = await putFile(contentB64, file.sha);
      return res.status(200).json({ ok: true, commit: r.commit });
    }

    return res.status(405).json({ ok:false, error: "Method not allowed" });
  } catch (err) {
    return res.status(500).json({ ok:false, error: err.message });
  }
}
