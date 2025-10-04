/* cloud_sync.js — cloud load/save via Vercel KV */
(function(){
  const LS_KEY = "sio_products_v1";
  function getLocal(){ try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; } }
  function setLocal(list){
    localStorage.setItem(LS_KEY, JSON.stringify(list || []));
    if (typeof window.renderProducts === "function") { try { window.renderProducts(); } catch {} }
  }
  async function apiGet(){
    const r = await fetch("/api/products", { cache: "no-store" });
    if (!r.ok) throw new Error("GET failed: " + r.status);
    const j = await r.json();
    return Array.isArray(j.products) ? j.products : [];
  }
  async function apiPost(list, secret){
    const r = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-secret": secret || "" },
      body: JSON.stringify({ products: list || [] })
    });
    if (!r.ok) { let t = ""; try { t = await r.text(); } catch {} ; throw new Error("POST failed: " + r.status + " " + t); }
    return r.json();
  }
  function addButtons(){
    const dock = document.getElementById("adminDock");
    if (!dock) return;
    const btnLoad = document.createElement("button");
    btnLoad.className = "btn"; btnLoad.textContent = "Загрузить из облака";
    btnLoad.addEventListener("click", async ()=>{
      try { const list = await apiGet(); setLocal(list); alert("Загружено товаров: " + list.length); }
      catch(e){ alert("Ошибка загрузки: " + e.message); }
    });
    const btnSave = document.createElement("button");
    btnSave.className = "btn"; btnSave.textContent = "Сохранить в облако";
    btnSave.addEventListener("click", async ()=>{
      try { const secret = prompt("Введите секрет для синхронизации"); if (!secret) return;
        const res = await apiPost(getLocal(), secret); alert("Сохранено в облако: " + (res.count ?? 0)); }
      catch(e){ alert("Ошибка сохранения: " + e.message); }
    });
    dock.appendChild(btnLoad); dock.appendChild(btnSave);
  }
  document.addEventListener("DOMContentLoaded", async ()=>{
    try { const local = getLocal(); if (!local || !local.length) { const cloud = await apiGet(); if (cloud && cloud.length) setLocal(cloud); } } catch{}
    addButtons();
  });
})();