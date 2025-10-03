
/* stickiton: localStorage migration + seed + re-render
   Drop-in script. Include before </body>:
   <script src="./ls_migration_seed.js"></script>
*/
(function(){
  const CANON = "sio_products_v1";
  const CANDIDATES = [
    "sio_products_v1",
    "stickiton.products.v1",
    "myshop.products.v1",
    "products.v1"
  ];
  const tryParse = v => { try { return JSON.parse(v); } catch { return null; } };

  // 1) migrate first non-empty candidate -> canonical
  (function migrate(){
    if (localStorage.getItem(CANON)) return;
    for (const k of CANDIDATES){
      const data = tryParse(localStorage.getItem(k));
      if (Array.isArray(data) && data.length){
        localStorage.setItem(CANON, JSON.stringify(data));
        break;
      }
    }
  })();

  // 2) seed defaults if still empty
  (function seedIfEmpty(){
    const cur = tryParse(localStorage.getItem(CANON));
    if (Array.isArray(cur) && cur.length) return;
    const seed = [
      { id:"sku-a", title:"Sticker Pack A", price:149, imgs:[], img:"", desc:"" },
      { id:"sku-b", title:"Sticker Pack B", price:149, imgs:[], img:"", desc:"" },
      { id:"sku-c", title:"Sticker Pack C", price:149, imgs:[], img:"", desc:"" },
      { id:"sku-d", title:"Sticker Pack D", price:149, imgs:[], img:"", desc:"" },
      { id:"sku-e", title:"Sticker Pack E", price:149, imgs:[], img:"", desc:"" },
      { id:"sku-f", title:"Sticker Pack F", price:149, imgs:[], img:"", desc:"" }
    ];
    localStorage.setItem(CANON, JSON.stringify(seed));
  })();

  // 3) force re-render
  (function rerender(){
    const run = () => {
      if (typeof window.renderProducts === "function"){
        try { window.renderProducts(); } catch {}
      }
    };
    if (document.readyState === "complete" || document.readyState === "interactive") run();
    else document.addEventListener("DOMContentLoaded", run);
  })();
})();
