(function(){
  const LS_KEY = "sio_products_v1";
  const API_URL = "/api/products";
  const MAX_IMGS = 5;

  // ==== утилиты ====
  const isValidUrl = u => !!u && typeof u === "string" && /^(https?:)?\/\//i.test(u);
  const uniq = arr => Array.from(new Set(arr || []));
  const sanitize = list => (Array.isArray(list)?list:[]).map(p=>{
    const raw = Array.isArray(p.imgs)?p.imgs:(p.img?[p.img]:[]);
    const imgs = uniq(raw.filter(isValidUrl)).slice(0,MAX_IMGS);
    return {...p,imgs,img:imgs[0]||""};
  });

  const getLocal = ()=>{ try{return JSON.parse(localStorage.getItem(LS_KEY)||"[]");}catch{return[];}};
  const setLocal = list=>{
    const clean = sanitize(list);
    localStorage.setItem(LS_KEY,JSON.stringify(clean));
    if(typeof window.renderProducts==="function")try{window.renderProducts();}catch{}
  };

  async function apiGet(){
    const r = await fetch(API_URL,{cache:"no-store"});
    const j = await r.json();
    return sanitize(j.products||[]);
  }

  async function apiPost(list,secret){
    const r = await fetch(API_URL,{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "x-admin-secret":secret||""
      },
      body:JSON.stringify({products:sanitize(list||[])})
    });
    if(!r.ok){
      let txt="";try{txt=await r.text();}catch{}
      throw new Error(`POST ${r.status} ${txt}`);
    }
    return r.json();
  }

  // ==== авто-загрузка при первом входе ====
  document.addEventListener("DOMContentLoaded",async()=>{
    try{
      const local=getLocal();
      if(!local.length){
        const cloud=await apiGet();
        if(cloud.length)setLocal(cloud);
      }else{
        setLocal(local);
      }
    }catch{}
  });

  // ==== интеграция в админ-панель ====
  document.addEventListener("DOMContentLoaded",()=>{
    const dock=document.getElementById("adminDock");
    if(!dock)return;

    // --- кнопка загрузки из облака ---
    const btnLoad=document.createElement("button");
    btnLoad.textContent="Загрузить из облака";
    btnLoad.onclick=async()=>{
      try{
        const list=await apiGet();
        setLocal(list);
        alert(`Загружено товаров: ${list.length}`);
      }catch(e){alert(`Ошибка загрузки: ${e.message}`);}
    };
    dock.appendChild(btnLoad);

    // --- кнопка ручного сохранения ---
    const btnSave=document.createElement("button");
    btnSave.textContent="Сохранить в облако";
    btnSave.onclick=async()=>{
      const secret=prompt("Введите секрет для синхронизации");
      if(!secret)return;
      try{
        const local=getLocal();
        const res=await apiPost(local,secret);
        alert(`Сохранено: ${res?.count??local.length}`);
      }catch(e){alert(`Ошибка: ${e.message}`);}
    };
    dock.appendChild(btnSave);
  });

  // ==== авто-синхронизация при локальном сохранении ====
  // перехватываем обновление localStorage (обычно через setItem)
  const origSetItem = localStorage.setItem;
  localStorage.setItem = function(k,v){
    origSetItem.apply(this,arguments);
    if(k===LS_KEY){
      try{
        const secret = sessionStorage.getItem("sio_sync_secret");
        if(!secret)return; // пользователь ещё не вводил
        const data = JSON.parse(v||"[]");
        apiPost(data,secret).catch(()=>{});
      }catch{}
    }
  };

  // при первом вводе секрета сохраняем его в sessionStorage
  window.addEventListener("keydown",e=>{
    if(e.key==="F9"){ // F9 — быстрая установка секрета
      const s=prompt("Введите секрет для авто-синхронизации");
      if(s)sessionStorage.setItem("sio_sync_secret",s);
    }
  });
})();
