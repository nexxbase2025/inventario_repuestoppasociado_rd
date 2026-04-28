
const BRAND_MODELS = {
  "Audi":["A3","A4","A5","A6","A7","A8","Q3","Q5","Q7","TT"],
  "BMW":["116i","118i","120i","125i","128i","130i","135i","318i","320i","325i","328i","330i","335i","428i","430i","520i","528i","530i","535i","740i","X1","X3","X5","X6"],
  "Mercedes-Benz":["C250","C300","C350","CLA250","CLS550","E350","E400","E550","GLA250","GLC300","GLE350","GLK350","ML350","S550"],
  "Volkswagen":["Amarok","Beetle","CC","Golf","Jetta","Passat","Tiguan","Touareg"],
  "Porsche":["Cayenne","Macan","Panamera","911","Boxster"],
  "Land Rover":["Discovery","Discovery Sport","Range Rover","Range Rover Evoque","Range Rover Sport"],
  "Volvo":["S60","S80","V60","XC60","XC90"],
  "MINI":["Cooper","Cooper S","Countryman","Clubman"],
  "Jaguar":["F-Pace","XE","XF","XJ"],
  "Peugeot":["206","207","208","3008","308","508"],
  "Renault":["Clio","Duster","Kangoo","Koleos","Logan","Megane"],
  "Fiat":["500","Punto","Doblo","Strada"],
  "Alfa Romeo":["Giulia","Giulietta","Mito","Stelvio"],
  "Citroen":["C3","C4","Berlingo","C5 Aircross"],
  "Opel":["Astra","Corsa","Insignia","Mokka"],
  "Toyota":["Corolla","Camry","RAV4","4Runner","Hilux","Yaris"]
};

let state = {
  items: [],
  filtered: [],
  categories: [],
  brands: [],
  currentItem: null,
  currentPhoto: null,
  clients: [],
  selectedClientKey: null
};

const els = {};
function $(id){ return document.getElementById(id); }

async function init(){
  registerSW();
  await dbInitDefaults();
  bindEls();
  bindEvents();
  renderQuickChips();
  await refreshAll();
  await initAutoBackup();
    initInstallPrompt();
  await onRoute();
}

function bindEls(){
  [
    "btnAdd","btnAddEmpty","btnClients","btnSales","btnSettings","btnExport","importFile",
    "q","filterCategory","filterBrand","filterAvailability","list","empty","resultCount","emptySearch",
    "statItems","statUnits","statCategories","statAlerts","quickChips",
    "dashTodaySales","dashWeekSales","dashMonthSales","dashYearSales",
    "dashProfit","dashAvgTicket","dashClients","dashNoSales",
    "dashMiniToday","dashMiniMonth","dashMiniYear","dashMiniProfit",
    "alertsList",
    "autoBackupBar","btnAutoBackupLater","btnAutoBackupDownload",
    "modalItem","itemForm","photoInput","photoPreview","btnRemovePhoto","btnDelete","itemModalTitle",
    "modalView","viewTitle","viewSubtitle","viewMedia","viewKV","btnEditFromView","btnShowQR","btnSell",
    "modalQR","qrCanvas","qrText","qrLabelMeta","btnPrintQR","btnPdfQR",
    "modalSell","sellForm","sellItemTitle","sellTotals",
    "modalSettings","settingsForm","btnResetSettings","btnResetAll",
    "modalSales","salesTotal","salesToday","salesCount","salesAvg","salesByCat","salesList",
    "modalClients","clientSearch","clientsList","clientInvoices",
    "brandList","categoryList","modelList",
    "singleView","mainApp","btnBackSingle","singleTitle","singleSubtitle","singleMedia","singleKV","btnEditSingle","btnShowQRSingle","btnSellSingle"
  ].forEach(k => els[k] = $(k));
}

function bindEvents(){
  els.btnAdd?.addEventListener("click", () => openItemModal());
  els.btnAddEmpty?.addEventListener("click", () => openItemModal());
  els.btnClients?.addEventListener("click", openClients);
  els.btnSales?.addEventListener("click", openSales);
  els.btnSettings?.addEventListener("click", openSettings);
  els.btnExport?.addEventListener("click", exportAll);
  els.importFile?.addEventListener("change", importAll);

  els.q?.addEventListener("input", applyFilters);
  els.filterCategory?.addEventListener("change", applyFilters);
  els.filterBrand?.addEventListener("change", applyFilters);
  els.filterAvailability?.addEventListener("change", applyFilters);

  els.clientSearch?.addEventListener("input", renderClientsList);

  els.btnAutoBackupDownload?.addEventListener("click", async ()=>{
    await exportAll(true);
    markBackupDoneToday();
    hideAutoBackupBanner();
    await refreshAll();
  });

  els.btnAutoBackupLater?.addEventListener("click", ()=>{
    markBackupPromptedToday();
    hideAutoBackupBanner();
  });

  document.body.addEventListener("click", (e)=>{
    const close = e.target?.dataset?.close;
    if(close) closeModal(close);
  });

  els.photoInput?.addEventListener("change", onPhotoSelected);
  els.btnRemovePhoto?.addEventListener("click", ()=>{
    state.currentPhoto = null;
    renderPhotoPreview(null);
  });

  els.itemForm?.addEventListener("submit", saveItem);
  els.btnDelete?.addEventListener("click", deleteItem);

  els.itemForm?.elements?.brand?.addEventListener("input", syncModelSuggestions);
  els.itemForm?.elements?.brand?.addEventListener("change", syncModelSuggestions);

  els.btnEditFromView?.addEventListener("click", ()=>{
    closeModal("modalView");
    openItemModal(state.currentItem);
  });

  els.btnShowQR?.addEventListener("click", ()=> openQR(state.currentItem));
  els.btnPrintQR?.addEventListener("click", printQRLabel);
  els.btnPdfQR?.addEventListener("click", downloadQRPdf);
  els.btnSell?.addEventListener("click", ()=> openSell(state.currentItem));

  els.sellForm?.addEventListener("input", updateSellTotals);
  els.sellForm?.addEventListener("submit", confirmSell);

  els.settingsForm?.addEventListener("submit", saveSettings);
  els.btnResetSettings?.addEventListener("click", resetSettings);
  els.btnResetAll?.addEventListener("click", resetAll);

  els.btnBackSingle?.addEventListener("click", ()=>{
    location.hash = "";
    showMain();
  });
  els.btnEditSingle?.addEventListener("click", ()=> openItemModal(state.currentItem));
  els.btnShowQRSingle?.addEventListener("click", ()=> openQR(state.currentItem));
  els.btnSellSingle?.addEventListener("click", ()=> openSell(state.currentItem));
}

function openModal(id){ $(id)?.classList.remove("hidden"); }
function closeModal(id){ $(id)?.classList.add("hidden"); }

async function refreshAll(){
  await loadItems();
  loadFacets();
  renderFilters();
  renderStats();
  await renderDashboard();
  applyFilters();
}

async function loadItems(){
  state.items = await db.items.orderBy("updatedAt").reverse().toArray();
}

function loadFacets(){
  const itemCategories = state.items.map(x => x.category).filter(Boolean);
  const itemBrands = state.items.map(x => x.brand).filter(Boolean);

  state.categories = Array.from(new Set([...DEFAULT_CATEGORIES, ...itemCategories])).sort((a,b)=>a.localeCompare(b));
  state.brands = Array.from(new Set([...DEFAULT_EURO_BRANDS, ...itemBrands])).sort((a,b)=>a.localeCompare(b));
}

function renderFilters(){
  const currentCategory = els.filterCategory?.value || "";
  const currentBrand = els.filterBrand?.value || "";

  if(els.filterCategory){
    els.filterCategory.innerHTML = `<option value="">Categoría (todas)</option>` +
      state.categories.map(c => `<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`).join("");
    if(state.categories.includes(currentCategory)) els.filterCategory.value = currentCategory;
  }

  if(els.filterBrand){
    els.filterBrand.innerHTML = `<option value="">Marca (todas)</option>` +
      state.brands.map(b => `<option value="${escapeAttr(b)}">${escapeHtml(b)}</option>`).join("");
    if(state.brands.includes(currentBrand)) els.filterBrand.value = currentBrand;
  }

  if(els.categoryList){
    els.categoryList.innerHTML = state.categories.map(c => `<option value="${escapeAttr(c)}"></option>`).join("");
  }

  if(els.brandList){
    els.brandList.innerHTML = state.brands.map(b => `<option value="${escapeAttr(b)}"></option>`).join("");
  }

  syncModelSuggestions();
}

function syncModelSuggestions(){
  if(!els.itemForm || !els.modelList) return;
  const brand = (els.itemForm.elements.brand?.value || "").trim();
  const builtIn = BRAND_MODELS[brand] || [];
  const existing = state.items.filter(i => i.brand === brand).map(i => i.model).filter(Boolean);
  const models = Array.from(new Set([...builtIn, ...existing])).sort((a,b)=>a.localeCompare(b));
  els.modelList.innerHTML = models.map(m => `<option value="${escapeAttr(m)}"></option>`).join("");
}
function renderQuickChips(){
  if(!els.quickChips) return;
  els.quickChips.innerHTML = QUICK_CHIPS.map(x => `
    <button type="button" class="chip" data-chip="${escapeAttr(x)}">${escapeHtml(x)}</button>
  `).join("");

  els.quickChips.querySelectorAll("[data-chip]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      els.q.value = btn.dataset.chip || "";
      applyFilters();
      els.q.focus();
    });
  });
}

function renderStats(){
  const totalItems = state.items.length;
  const totalUnits = state.items.reduce((sum,i)=>sum + safeNum(i.stock), 0);
  const totalCategories = new Set(state.items.map(i => i.category).filter(Boolean)).size;
  const alerts = state.items.filter(i => safeNum(i.stock) <= safeNum(i.lowStock, 3)).length;

  if(els.statItems) els.statItems.textContent = String(totalItems);
  if(els.statUnits) els.statUnits.textContent = String(totalUnits);
  if(els.statCategories) els.statCategories.textContent = String(totalCategories);
  if(els.statAlerts) els.statAlerts.textContent = String(alerts);
}

function pad2(n){ return String(n).padStart(2, "0"); }
function pad6(n){ return String(n).padStart(6, "0"); }

function localDateKey(dateObj){
  return `${dateObj.getFullYear()}-${pad2(dateObj.getMonth()+1)}-${pad2(dateObj.getDate())}`;
}

function startOfWeek(date){
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() + diff);
  return d;
}

function startOfYear(date){
  return new Date(date.getFullYear(), 0, 1, 0, 0, 0, 0);
}

async function renderDashboard(){
  const sales = await db.sales.orderBy("createdAt").reverse().toArray();
  const settings = await getSettings();
  const currency = settings?.currency || "USD";
  const itemsById = new Map(state.items.map(i => [i.id, i]));

  const nowDate = new Date();
  const todayK = localDateKey(nowDate);
  const weekStart = startOfWeek(nowDate);
  const yearStart = startOfYear(nowDate);
  const currentMonth = nowDate.getMonth();
  const currentYear = nowDate.getFullYear();

  const todaySales = sales.filter(s => localDateKey(new Date(s.createdAt)) === todayK);
  const weekSales = sales.filter(s => new Date(s.createdAt) >= weekStart);
  const monthSales = sales.filter(s => {
    const d = new Date(s.createdAt);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const yearSales = sales.filter(s => new Date(s.createdAt) >= yearStart);

  const todayTotal = todaySales.reduce((sum,s)=>sum + safeNum(s.total), 0);
  const weekTotal = weekSales.reduce((sum,s)=>sum + safeNum(s.total), 0);
  const monthTotal = monthSales.reduce((sum,s)=>sum + safeNum(s.total), 0);
  const yearTotal = yearSales.reduce((sum,s)=>sum + safeNum(s.total), 0);

  const profit = sales.reduce((sum,s)=>{
    const item = itemsById.get(s.itemId);
    const cost = safeNum(item?.cost);
    return sum + ((safeNum(s.unitPrice) - cost) * safeNum(s.qty));
  }, 0);

  const avgTicket = sales.length ? sales.reduce((sum,s)=>sum + safeNum(s.total), 0) / sales.length : 0;
  const clientCount = new Set(sales.map(s => normalize(s.customer || "Consumidor final"))).size;
  const soldIds = new Set(sales.map(s => s.itemId));
  const noSalesCount = state.items.filter(i => !soldIds.has(i.id)).length;

  if(els.dashTodaySales) els.dashTodaySales.textContent = money(todayTotal, currency);
  if(els.dashWeekSales) els.dashWeekSales.textContent = money(weekTotal, currency);
  if(els.dashMonthSales) els.dashMonthSales.textContent = money(monthTotal, currency);
  if(els.dashYearSales) els.dashYearSales.textContent = money(yearTotal, currency);
  if(els.dashProfit) els.dashProfit.textContent = money(profit, currency);
  if(els.dashAvgTicket) els.dashAvgTicket.textContent = money(avgTicket, currency);
  if(els.dashClients) els.dashClients.textContent = String(clientCount);
  if(els.dashNoSales) els.dashNoSales.textContent = String(noSalesCount);

  if(els.dashMiniToday) els.dashMiniToday.textContent = money(todayTotal, currency);
  if(els.dashMiniMonth) els.dashMiniMonth.textContent = money(monthTotal, currency);
  if(els.dashMiniYear) els.dashMiniYear.textContent = money(yearTotal, currency);
  if(els.dashMiniProfit) els.dashMiniProfit.textContent = money(profit, currency);

  renderAlerts();
}

function renderAlerts(){
  const alerts = [];

  const lowStockItems = state.items.filter(i => {
    const stock = safeNum(i.stock);
    const low = safeNum(i.lowStock, 3);
    return stock > 0 && stock <= low;
  });

  const outItems = state.items.filter(i => safeNum(i.stock) <= 0);
  const noPhoto = state.items.filter(i => !i.photo);
  const noPrice = state.items.filter(i => safeNum(i.price) <= 0);
  const noOem = state.items.filter(i => !String(i.oem || "").trim());

  if(outItems.length){
    alerts.push({
      tone:"red",
      title:`${outItems.length} repuesto(s) agotado(s)`,
      text:`Revisa piezas sin stock para evitar ventas perdidas.`
    });
  }

  if(lowStockItems.length){
    alerts.push({
      tone:"gold",
      title:`${lowStockItems.length} repuesto(s) con stock bajo`,
      text:`Conviene reabastecer antes de que se agoten.`
    });
  }

  if(noPhoto.length){
    alerts.push({
      tone:"blue",
      title:`${noPhoto.length} repuesto(s) sin foto`,
      text:`Agregar imágenes mejora la identificación rápida del inventario.`
    });
  }

  if(noPrice.length){
    alerts.push({
      tone:"red",
      title:`${noPrice.length} repuesto(s) sin precio de venta`,
      text:`No conviene dejarlos así porque afectan el despacho y la facturación.`
    });
  }

  if(noOem.length){
    alerts.push({
      tone:"blue",
      title:`${noOem.length} repuesto(s) sin OEM`,
      text:`Completar el número de parte ayuda a buscar y validar compatibilidad.`
    });
  }

  const meta = metaGet();
  if(meta.dirty && meta.lastBackupDate !== todayKey()){
    alerts.push({
      tone:"green",
      title:"Hay cambios sin backup de hoy",
      text:"Se recomienda descargar un backup actualizado del inventario y las ventas."
    });
  }

  if(!alerts.length){
    els.alertsList.innerHTML = `
      <div class="alertItem alertItem--green">
        <div class="alertItem__title">Sin alertas críticas</div>
        <div class="alertItem__text">Todo parece estar en orden.</div>
      </div>
    `;
    return;
  }

  els.alertsList.innerHTML = alerts.slice(0,6).map(a => `
    <div class="alertItem alertItem--${escapeAttr(a.tone)}">
      <div class="alertItem__title">${escapeHtml(a.title)}</div>
      <div class="alertItem__text">${escapeHtml(a.text)}</div>
    </div>
  `).join("");
}

function applyFilters(){
  const q = normalize(els.q?.value || "");
  const cat = els.filterCategory?.value || "";
  const brand = els.filterBrand?.value || "";
  const av = els.filterAvailability?.value || "";

  const hasFilter = Boolean(q || cat || brand || av);
  if(!hasFilter){
    state.filtered = [];
    renderList(true);
    return;
  }

  let rows = state.items.slice();

  if(cat) rows = rows.filter(i => i.category === cat);
  if(brand) rows = rows.filter(i => i.brand === brand);

  if(av){
    rows = rows.filter(i=>{
      const stock = safeNum(i.stock);
      const low = safeNum(i.lowStock, 3);
      if(av === "in") return stock > 0;
      if(av === "out") return stock <= 0;
      if(av === "low") return stock > 0 && stock <= low;
      return true;
    });
  }

  if(q){
    rows = rows.filter(i=>{
      const haystack = [
        i.sku, i.oem, i.category, i.brand, i.model, i.engine, i.name, i.location, i.notes, i.condition,
        i.yearFrom, i.yearTo
      ].map(normalize).join(" | ");
      return haystack.includes(q);
    });
  }

  state.filtered = rows;
  renderList(false);
}

async function renderList(showHint){
  if(els.resultCount){
    els.resultCount.textContent = `${state.filtered.length} repuesto${state.filtered.length===1?"":"s"}`;
  }
  els.emptySearch?.classList.toggle("hidden", !showHint);

  if(state.items.length === 0){
    els.empty?.classList.remove("hidden");
    if(els.list) els.list.innerHTML = "";
    return;
  }
  els.empty?.classList.add("hidden");

  if(showHint){
    if(els.list) els.list.innerHTML = "";
    return;
  }

  const settings = await getSettings();
  const currency = settings?.currency || "USD";

  const html = state.filtered.map(item=>{
    const stock = safeNum(item.stock);
    const lowStock = safeNum(item.lowStock, 3);
    const years = yearsLabel(item.yearFrom, item.yearTo);
    const img = item.photo ? URL.createObjectURL(item.photo) : null;

    let stockBadge = `<span class="badge badge--green">Stock: ${stock}</span>`;
    if(stock <= 0) stockBadge = `<span class="badge badge--red">Agotado</span>`;
    else if(stock <= lowStock) stockBadge = `<span class="badge badge--gold">Bajo stock: ${stock}</span>`;

    return `
      <div class="card" data-id="${escapeAttr(item.id)}">
        <div class="thumb">${img ? `<img src="${img}" alt="">` : `<span class="muted small">Sin foto</span>`}</div>
        <div>
          <div class="card__title">${escapeHtml(item.name || item.sku)}</div>
          <div class="muted small">${escapeHtml(item.sku)}${item.oem ? ` • OEM: ${escapeHtml(item.oem)}` : ""}</div>
          <div class="card__meta">
            <span class="badge badge--gold">${escapeHtml(item.category || "Sin categoría")}</span>
            <span class="badge badge--blue">${escapeHtml(item.brand || "—")}</span>
            <span class="badge">${escapeHtml(item.model || "—")}</span>
            <span class="badge">${escapeHtml(years)}</span>
            <span class="badge">${escapeHtml(item.condition || "—")}</span>
            ${stockBadge}
          </div>
        </div>
        <div class="price">
          <div>${money(item.price, currency)}</div>
          <div class="muted small">${item.location ? `Ubicación: ${escapeHtml(item.location)}` : "Sin ubicación"}</div>
        </div>
      </div>
    `;
  });

  els.list.innerHTML = html.join("");

  els.list.querySelectorAll(".card").forEach(card=>{
    card.addEventListener("click", async ()=>{
      const item = await db.items.get(card.dataset.id);
      if(item) openView(item);
    });
  });
}
function openItemModal(item=null){
  state.currentItem = item;
  state.currentPhoto = item?.photo ?? null;

  els.itemForm.reset();
  els.itemModalTitle.textContent = item ? "Editar repuesto" : "Nuevo repuesto";
  els.btnDelete.classList.toggle("hidden", !item);

  if(item){
    for(const [k,v] of Object.entries(item)){
      const field = els.itemForm.elements[k];
      if(field && typeof v !== "object") field.value = v ?? "";
    }
  }else{
    els.itemForm.elements.condition.value = "Nuevo";
    els.itemForm.elements.lowStock.value = "3";
    els.itemForm.elements.stock.value = "0";
    els.itemForm.elements.cost.value = "0";
    els.itemForm.elements.price.value = "0";
  }

  syncModelSuggestions();
  renderPhotoPreview(state.currentPhoto);
  openModal("modalItem");
}

async function onPhotoSelected(e){
  const file = e.target.files?.[0];
  if(!file) return;
  try{
    const { blob, size } = await compressImage(file, { maxSide: 1600, quality: 0.78, preferWebp: true });
    state.currentPhoto = blob;
    renderPhotoPreview(blob, size);
  }catch(err){
    alert(err.message || "No se pudo procesar la imagen.");
  }finally{
    e.target.value = "";
  }
}

function renderPhotoPreview(blob, size=null){
  if(!blob){
    els.photoPreview.innerHTML = `<div class="muted">Sin foto</div>`;
    return;
  }
  const url = URL.createObjectURL(blob);
  const kb = Math.round((size ?? blob.size) / 1024);
  els.photoPreview.innerHTML = `<div style="position:relative;width:100%;height:100%"><img src="${url}" alt=""><div class="photoBadge">${kb} KB</div></div>`;
}

async function saveItem(e){
  e.preventDefault();

  const raw = Object.fromEntries(new FormData(els.itemForm).entries());
  const item = {
    id: state.currentItem?.id || uuid(),
    sku: (raw.sku || "").trim(),
    oem: (raw.oem || "").trim(),
    category: (raw.category || "").trim(),
    location: (raw.location || "").trim(),
    brand: (raw.brand || "").trim(),
    model: (raw.model || "").trim(),
    engine: (raw.engine || "").trim(),
    yearFrom: raw.yearFrom ? parseInt(raw.yearFrom, 10) : "",
    yearTo: raw.yearTo ? parseInt(raw.yearTo, 10) : "",
    condition: raw.condition || "Nuevo",
    stock: safeNum(raw.stock),
    cost: safeNum(raw.cost),
    price: safeNum(raw.price),
    name: (raw.name || "").trim(),
    notes: (raw.notes || "").trim(),
    lowStock: raw.lowStock ? parseInt(raw.lowStock, 10) : 3,
    photo: state.currentPhoto || null,
    createdAt: state.currentItem?.createdAt || now(),
    updatedAt: now()
  };

  if(!item.sku || !item.name || !item.category || !item.brand || !item.model || !item.location){
    alert("Completa al menos: SKU, nombre, categoría, marca, modelo y ubicación.");
    return;
  }

  const existing = await db.items.where("sku").equals(item.sku).first();
  if(existing && existing.id !== item.id){
    alert("Ya existe otro repuesto con ese SKU.");
    return;
  }

  await db.items.put(item);
  markDirty();
  closeModal("modalItem");
  await refreshAll();
}

async function deleteItem(){
  if(!state.currentItem) return;
  if(!confirm("¿Seguro que quieres eliminar este repuesto?")) return;

  await db.items.delete(state.currentItem.id);
  markDirty();
  closeModal("modalItem");
  closeModal("modalView");
  await refreshAll();
}

async function openView(item){
  state.currentItem = item;

  els.viewTitle.textContent = item.name || item.sku;
  els.viewSubtitle.textContent = `${item.sku}${item.oem ? ` • OEM: ${item.oem}` : ""} • ${item.brand} ${item.model} • ${yearsLabel(item.yearFrom, item.yearTo)}`;

  if(item.photo){
    els.viewMedia.innerHTML = `<img src="${URL.createObjectURL(item.photo)}" alt="">`;
  }else{
    els.viewMedia.innerHTML = `<div class="muted">Sin foto</div>`;
  }

  const settings = await getSettings();
  const rows = [
    ["Categoría", item.category],
    ["Marca", item.brand],
    ["Modelo", item.model],
    ["Motor / Versión", item.engine || "—"],
    ["Años", yearsLabel(item.yearFrom, item.yearTo)],
    ["Ubicación", item.location || "—"],
    ["Estado", item.condition || "—"],
    ["Stock", String(safeNum(item.stock))],
    ["Stock mínimo", String(safeNum(item.lowStock, 3))],
    ["Precio", money(item.price, settings?.currency || "USD")],
    ["Costo", money(item.cost, settings?.currency || "USD")],
    ["OEM / Part Number", item.oem || "—"],
    ["Notas", item.notes || "—"]
  ];

  els.viewKV.innerHTML = rows.map(([k,v])=>`
    <div class="row">
      <div class="k">${escapeHtml(k)}</div>
      <div class="v">${escapeHtml(String(v))}</div>
    </div>
  `).join("");

  openModal("modalView");
}

function buildQRDeepLink(item){
  const params = new URLSearchParams({
    sku: item.sku,
    name: item.name || "",
    cat: item.category || "",
    brand: item.brand || "",
    model: item.model || "",
    engine: item.engine || "",
    yf: item.yearFrom || "",
    yt: item.yearTo || "",
    loc: item.location || "",
    oem: item.oem || "",
    cond: item.condition || ""
  });

  const base = `${location.origin}${location.pathname.replace(/\/[^\/]*$/, "/")}`;
  return `${base}item.html?${params.toString()}`;
}

function openQR(item){
  if(!item) return;

  const url = buildQRDeepLink(item);

  els.qrText.textContent = url;
  els.qrLabelMeta.innerHTML = `
    <div><strong>${escapeHtml(item.name || item.sku)}</strong></div>
    <div>${escapeHtml(item.sku)}${item.condition ? ` • ${escapeHtml(item.condition)}` : ""}</div>
    <div>${escapeHtml(item.brand || "")} ${escapeHtml(item.model || "")}</div>
  `;

  new QRious({
    element: els.qrCanvas,
    value: url,
    size: 160,
    level: "H"
  });

  openModal("modalQR");
}

function printQRLabel(){
  const item = state.currentItem;
  const url = els.qrText.textContent;
  if(!item || !url) return;

  const w = window.open("", "_blank", "width=420,height=480");
  if(!w) return;

  w.document.write(`
    <html>
      <head>
        <title>Etiqueta QR</title>
        <style>
          *{box-sizing:border-box}
          body{font-family:Arial,sans-serif;padding:18px;color:#111;display:flex;justify-content:center}
          .label{
            width:2.4in;
            min-height:2.4in;
            border:1px solid #d0d7de;
            border-radius:16px;
            padding:10px;
            display:grid;
            gap:8px;
            justify-items:center;
          }
          .t{font-size:12px;font-weight:700;text-align:center;line-height:1.25}
          .s{font-size:10px;color:#555;text-align:center;line-height:1.2}
          canvas{display:block;background:#fff}
          @media print{
            body{padding:0}
            .label{border:none;border-radius:0}
          }
        </style>
      </head>
      <body>
        <div class="label">
          <canvas id="c"></canvas>
          <div class="t">${escapeHtml(item.name || item.sku)}</div>
          <div class="s">${escapeHtml(item.sku)}${item.condition ? ` • ${escapeHtml(item.condition)}` : ""}</div>
          <div class="s">${escapeHtml(item.brand || "")} ${escapeHtml(item.model || "")}</div>
        </div>
        <script src="https://cdn.jsdelivr.net/npm/qrious@4.0.2/dist/qrious.min.js"><\/script>
        <script>
          new QRious({ element: document.getElementById("c"), value: ${JSON.stringify(url)}, size: 150, level: "H" });
          setTimeout(()=>window.print(), 250);
        <\/script>
      </body>
    </html>
  `);
  w.document.close();
}

async function downloadQRPdf(){
  const item = state.currentItem;
  const url = els.qrText.textContent;
  if(!item || !url) return;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit:"pt", format:"a4" });

  const x = 40;
  const y = 40;
  const size = 172;
  const canvas = document.createElement("canvas");
  new QRious({ element: canvas, value: url, size: 160, level: "H" });

  doc.setDrawColor(210);
  doc.roundedRect(x, y, size, size + 54, 12, 12);
  doc.addImage(canvas.toDataURL("image/png"), "PNG", x + 6, y + 6, 160, 160);
  doc.setFont("helvetica","bold");
  doc.setFontSize(10);
  doc.text(item.name || item.sku, x + size/2, y + 180, { align:"center", maxWidth:150 });
  doc.setFont("helvetica","normal");
  doc.setFontSize(9);
  doc.text(`${item.sku}${item.condition ? ` • ${item.condition}` : ""}`, x + size/2, y + 196, { align:"center", maxWidth:150 });
  doc.text(`${item.brand || ""} ${item.model || ""}`.trim(), x + size/2, y + 210, { align:"center", maxWidth:150 });

  doc.save(`QR-${item.sku || "pieza"}.pdf`);
}

async function openSell(item){
  if(!item) return;

  const settings = await getSettings();
  els.sellForm.reset();
  els.sellItemTitle.textContent = `${item.name || item.sku} • Stock actual: ${safeNum(item.stock)}`;
  els.sellForm.elements.saleDate.value = toLocalInputValue();
  els.sellForm.elements.qty.value = "1";
  els.sellForm.elements.unitPrice.value = String(safeNum(item.price));
  els.sellForm.dataset.taxPercent = String(safeNum(settings?.taxPercent));
  els.sellForm.elements.taxMode.value = (safeNum(settings?.taxPercent) > 0 ? "on" : "off");
  updateSellTotals();
  openModal("modalSell");
}

function updateSellTotals(){
  const qty = Math.max(1, parseInt(els.sellForm.elements.qty.value || "1", 10));
  const unitPrice = Math.max(0, safeNum(els.sellForm.elements.unitPrice.value));
  const taxMode = els.sellForm.elements.taxMode.value;
  const taxPercent = safeNum(els.sellForm.dataset.taxPercent);
  const settingsCurrency = (JSON.parse(localStorage.getItem("rppa_settings") || "{}")?.currency) || "USD";

  const subtotal = qty * unitPrice;
  const tax = taxMode === "on" ? subtotal * (taxPercent / 100) : 0;
  const total = subtotal + tax;

  els.sellTotals.innerHTML = `
    <div class="line"><span class="muted">Subtotal</span><span>${money(subtotal, settingsCurrency)}</span></div>
    <div class="line"><span class="muted">IVA / Tax (${taxMode==="on" ? taxPercent : 0}%)</span><span>${money(tax, settingsCurrency)}</span></div>
    <div class="line total"><span>Total</span><span>${money(total, settingsCurrency)}</span></div>
  `;
}

function formatLocalInvoiceStamp(dateObj){
  const y = dateObj.getFullYear();
  const m = pad2(dateObj.getMonth() + 1);
  const d = pad2(dateObj.getDate());
  const hh = pad2(dateObj.getHours());
  const mm = pad2(dateObj.getMinutes());
  const ss = pad2(dateObj.getSeconds());
  return `INV-${y}${m}${d}-${hh}${mm}${ss}`;
}

function parseSaleLocalDate(){
  const raw = els.sellForm.elements.saleDate.value;
  if(raw) return new Date(raw);
  return new Date();
}

function formatLocalDateTimeText(dateObj){
  return dateObj.toLocaleString("en-US");
}

async function getNextInvoiceSeq(){
  const sales = await db.sales.toArray();
  let max = 0;
  for(const sale of sales){
    const num = Number(sale.invoiceSeq || 0);
    if(Number.isFinite(num) && num > max) max = num;
  }
  return max + 1;
}

async function confirmSell(e){
  e.preventDefault();
  const item = state.currentItem;
  if(!item) return;

  const qty = Math.max(1, parseInt(els.sellForm.elements.qty.value || "1", 10));
  if(qty > safeNum(item.stock)){
    alert("No hay suficiente stock para despachar esa cantidad.");
    return;
  }

  const settings = await getSettings();
  const localSaleDate = parseSaleLocalDate();
  const saleDate = localSaleDate.toISOString();
  const saleDateText = formatLocalDateTimeText(localSaleDate);

  const unitPrice = Math.max(0, safeNum(els.sellForm.elements.unitPrice.value));
  const taxMode = els.sellForm.elements.taxMode.value;
  const taxPercent = taxMode === "on" ? safeNum(settings?.taxPercent) : 0;
  const customer = (els.sellForm.elements.customer.value || "").trim();
  const customerPhone = (els.sellForm.elements.customerPhone.value || "").trim();
  const customerAddress = (els.sellForm.elements.customerAddress.value || "").trim();
  const ref = (els.sellForm.elements.ref.value || "").trim();
  const saleNotes = (els.sellForm.elements.saleNotes.value || "").trim();

  const subtotal = qty * unitPrice;
  const tax = subtotal * (taxPercent / 100);
  const total = subtotal + tax;

  const invoiceSeq = await getNextInvoiceSeq();
  const invoiceNo = formatLocalInvoiceStamp(localSaleDate);

  await db.sales.add({
    id: uuid(),
    invoiceNo,
    invoiceSeq,
    itemId: item.id,
    sku: item.sku,
    qty,
    unitPrice,
    taxPercent,
    tax,
    subtotal,
    total,
    customer,
    customerPhone,
    customerAddress,
    ref,
    saleNotes,
    createdAt: saleDate,
    saleDateText
  });

  await db.items.update(item.id, {
    stock: safeNum(item.stock) - qty,
    updatedAt: now()
  });

  markDirty();
  closeModal("modalSell");
  closeModal("modalView");
  await refreshAll();

  const updated = await db.items.get(item.id);
  openInvoiceWindow(updated, {
    invoiceNo,
    invoiceSeq,
    saleDate,
    saleDateText,
    qty,
    unitPrice,
    taxPercent,
    tax,
    subtotal,
    total,
    customer,
    customerPhone,
    customerAddress,
    ref,
    saleNotes
  });
}
function invoiceHTML(item, sale, settings, isPreview=false){
  const currency = settings?.currency || "USD";
  const saleDateText = sale.saleDateText || new Date(sale.saleDate || now()).toLocaleString("en-US");
  const invoiceSeqText = pad6(sale.invoiceSeq || 1);

  return `
    <div class="wrap">
      <div class="toolbar no-print">
        <button onclick="window.print()">Imprimir</button>
        <button onclick="window.downloadInvoicePdf()">Descargar PDF</button>
        <button onclick="window.close()">Cerrar</button>
      </div>

      <div class="top">
        <div>
          <div class="name">${escapeHtml(settings.bizName || "Repuesto PP & Asociado")}</div>
          <div class="sub">${escapeHtml(settings.bizAddress || "")}</div>
          <div class="sub">Tel: ${escapeHtml(settings.bizPhone || "")}</div>
          ${settings.bizRnc ? `<div class="sub">ID / Tax ID: ${escapeHtml(settings.bizRnc)}</div>` : ""}
        </div>
        <div style="text-align:right">
          <div class="title">Invoice</div>
          <div class="sub"><strong>Code:</strong> ${escapeHtml(sale.invoiceNo || "INV-00000000-000000")}</div>
          <div class="sub"><strong>No.:</strong> ${escapeHtml(invoiceSeqText)}</div>
          <div class="sub"><strong>Date:</strong> ${escapeHtml(saleDateText)}</div>
          ${sale.ref ? `<div class="sub"><strong>Reference:</strong> ${escapeHtml(sale.ref)}</div>` : ""}
          ${isPreview ? `<div class="sub"><strong>Mode:</strong> PREVIEW</div>` : ""}
        </div>
      </div>

      <div class="grid">
        <div class="box">
          <div class="title">Cliente</div>
          <div>${escapeHtml(sale.customer || "Consumidor final")}</div>
          ${sale.customerPhone ? `<div class="muted">Tel: ${escapeHtml(sale.customerPhone)}</div>` : ""}
          ${sale.customerAddress ? `<div class="muted">${escapeHtml(sale.customerAddress)}</div>` : ""}
        </div>

        <div class="box">
          <div class="title">Repuesto</div>
          <div><strong>${escapeHtml(item.name || item.sku)}</strong></div>
          <div class="muted">SKU: ${escapeHtml(item.sku)}</div>
          ${item.oem ? `<div class="muted">OEM: ${escapeHtml(item.oem)}</div>` : ""}
          <div class="muted">${escapeHtml(item.brand || "")} ${escapeHtml(item.model || "")} ${item.engine ? `• ${escapeHtml(item.engine)}` : ""}</div>
          ${item.category ? `<div class="muted"><strong>Categoría:</strong> ${escapeHtml(item.category)}</div>` : ""}
          <div class="muted"><strong>Condición:</strong> ${escapeHtml(item.condition || "—")}</div>
        </div>
      </div>

      <div class="box">
        <table>
          <thead>
            <tr>
              <th>Descripción</th>
              <th class="r">Cant.</th>
              <th class="r">P. Unit</th>
              <th class="r">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${escapeHtml(item.name || item.sku)}${item.condition ? ` (${escapeHtml(item.condition)})` : ""}</td>
              <td class="r">${escapeHtml(String(sale.qty || 1))}</td>
              <td class="r">${money(sale.unitPrice || 0, currency)}</td>
              <td class="r">${money(sale.subtotal || 0, currency)}</td>
            </tr>
            <tr>
              <td colspan="3" class="r"><strong>IVA / Tax (${sale.taxPercent || 0}%)</strong></td>
              <td class="r">${money(sale.tax || 0, currency)}</td>
            </tr>
            <tr class="total">
              <td colspan="3" class="r">Total</td>
              <td class="r">${money(sale.total || 0, currency)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      ${sale.saleNotes ? `<div class="box"><div class="title">Notas</div><div>${escapeHtml(sale.saleNotes)}</div></div>` : ""}
    </div>
  `;
}

async function downloadInvoicePdf(item, sale){
  const settings = await getSettings();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const currency = settings?.currency || "USD";

  let y = 50;
  const line = 20;
  const invoiceSeqText = pad6(sale.invoiceSeq || 1);
  const saleDateText = sale.saleDateText || new Date(sale.saleDate || now()).toLocaleString("en-US");

  doc.setFont("helvetica","bold");
  doc.setFontSize(20);
  doc.text(settings.bizName || "Repuesto PP & Asociado", 40, y); y += line;

  doc.setFont("helvetica","normal");
  doc.setFontSize(10);
  if(settings.bizAddress){ doc.text(settings.bizAddress, 40, y); y += 14; }
  if(settings.bizPhone){ doc.text(`Tel: ${settings.bizPhone}`, 40, y); y += 14; }
  if(settings.bizRnc){ doc.text(`ID / Tax ID: ${settings.bizRnc}`, 40, y); y += 14; }

  y += 10;
  doc.setFont("helvetica","bold");
  doc.text("Invoice", 40, y); y += line;
  doc.setFont("helvetica","normal");
  doc.text(`Code: ${sale.invoiceNo || "INV-00000000-000000"}`, 40, y); y += 14;
  doc.text(`No.: ${invoiceSeqText}`, 40, y); y += 14;
  doc.text(`Date: ${saleDateText}`, 40, y); y += 14;
  if(sale.ref){ doc.text(`Reference: ${sale.ref}`, 40, y); y += 14; }

  y += 14;
  doc.setFont("helvetica","bold");
  doc.text("Cliente", 40, y);
  doc.text("Repuesto", 300, y);
  y += line;

  doc.setFont("helvetica","normal");
  doc.text(sale.customer || "Consumidor final", 40, y);
  doc.text(item.name || item.sku, 300, y); y += 14;
  if(sale.customerPhone){ doc.text(`Tel: ${sale.customerPhone}`, 40, y); }
  doc.text(`SKU: ${item.sku}`, 300, y); y += 14;
  if(sale.customerAddress){ doc.text(sale.customerAddress, 40, y); }
  if(item.oem){ doc.text(`OEM: ${item.oem}`, 300, y); y += 14; }
  doc.text(`${item.brand || ""} ${item.model || ""} ${item.engine ? "• " + item.engine : ""}`.trim(), 300, y); y += 14;
  if(item.category){ doc.text(`Categoría: ${item.category}`, 300, y); y += 14; }
  doc.text(`Condición: ${item.condition || "—"}`, 300, y); y += 20;

  doc.setDrawColor(220);
  doc.line(40, y, 555, y); y += 20;

  doc.setFont("helvetica","bold");
  doc.text("Descripción", 40, y);
  doc.text("Cant.", 340, y, { align:"right" });
  doc.text("P. Unit", 435, y, { align:"right" });
  doc.text("Subtotal", 555, y, { align:"right" });
  y += 16;

  doc.setFont("helvetica","normal");
  doc.text(`${item.name || item.sku}${item.condition ? ` (${item.condition})` : ""}`, 40, y);
  doc.text(String(sale.qty || 1), 340, y, { align:"right" });
  doc.text(money(sale.unitPrice || 0, currency), 435, y, { align:"right" });
  doc.text(money(sale.subtotal || 0, currency), 555, y, { align:"right" });
  y += 20;

  doc.text(`IVA / Tax (${sale.taxPercent || 0}%)`, 435, y, { align:"right" });
  doc.text(money(sale.tax || 0, currency), 555, y, { align:"right" });
  y += 20;

  doc.setFont("helvetica","bold");
  doc.text("Total", 435, y, { align:"right" });
  doc.text(money(sale.total || 0, currency), 555, y, { align:"right" });
  y += 24;

  if(sale.saleNotes){
    doc.setFont("helvetica","bold");
    doc.text("Notas", 40, y); y += 16;
    doc.setFont("helvetica","normal");
    const lines = doc.splitTextToSize(sale.saleNotes, 500);
    doc.text(lines, 40, y);
  }

  doc.save(`Invoice-${sale.invoiceNo || "INV-00000000-000000"}-${invoiceSeqText}.pdf`);
}

function openInvoiceWindow(item, sale, isPreview=false){
  const settingsRaw = localStorage.getItem("rppa_settings") || "{}";
  const settings = JSON.parse(settingsRaw);
  const html = invoiceHTML(item, sale, settings, isPreview);

  const w = window.open("", "_blank", "width=900,height=900");
  if(!w) return null;

  w.document.write(`
    <html>
      <head>
        <title>Invoice ${escapeHtml(sale.invoiceNo || "")}</title>
        <style>
          *{box-sizing:border-box}
          body{font-family:Arial,sans-serif;padding:26px;color:#0f172a;background:#f8fafc}
          .wrap{max-width:760px;margin:0 auto;background:#fff;padding:24px;border-radius:18px;border:1px solid #dbe4ee}
          .toolbar{display:flex;gap:10px;justify-content:flex-end;margin-bottom:18px}
          .toolbar button{padding:10px 14px;border:1px solid #cbd5e1;background:#fff;border-radius:10px;cursor:pointer;font-weight:700}
          .top{display:flex;justify-content:space-between;gap:20px;align-items:flex-start}
          .name{font-size:28px;font-weight:800}
          .sub{font-size:13px;color:#475569;line-height:1.5;margin-top:6px}
          .box{border:1px solid #dbe4ee;border-radius:16px;padding:16px;margin-top:18px}
          .title{font-size:14px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#334155;margin-bottom:10px}
          table{width:100%;border-collapse:collapse}
          th,td{padding:12px 10px;border-bottom:1px solid #e8eef5;text-align:left;font-size:14px}
          th{background:#f8fbff}
          .r{text-align:right}
          .total td{font-weight:800;font-size:16px}
          .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
          .muted{color:#64748b}
          @media print{
            body{background:#fff;padding:0}
            .wrap{border:none;border-radius:0;padding:0}
            .no-print{display:none!important}
          }
        </style>
      </head>
      <body>
        ${html}
        <script src="https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js"><\/script>
        <script>
          const invoiceItem = ${JSON.stringify(item)};
          const invoiceSale = ${JSON.stringify(sale)};
          const invoiceSettings = ${settingsRaw};

          function pad6(v){
            return String(v || 1).padStart(6, "0");
          }

          window.downloadInvoicePdf = function(){
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ unit: "pt", format: "a4" });
            const currency = invoiceSettings.currency || "USD";
            let y = 50;
            const line = 20;
            const invoiceSeqText = pad6(invoiceSale.invoiceSeq || 1);
            const saleDateText = invoiceSale.saleDateText || new Date(invoiceSale.saleDate || new Date().toISOString()).toLocaleString("en-US");

            doc.setFont("helvetica","bold");
            doc.setFontSize(20);
            doc.text(invoiceSettings.bizName || "Repuesto PP & Asociado", 40, y); y += line;

            doc.setFont("helvetica","normal");
            doc.setFontSize(10);
            if(invoiceSettings.bizAddress){ doc.text(invoiceSettings.bizAddress, 40, y); y += 14; }
            if(invoiceSettings.bizPhone){ doc.text("Tel: " + invoiceSettings.bizPhone, 40, y); y += 14; }
            if(invoiceSettings.bizRnc){ doc.text("ID / Tax ID: " + invoiceSettings.bizRnc, 40, y); y += 14; }

            y += 10;
            doc.setFont("helvetica","bold");
            doc.text("Invoice", 40, y); y += line;
            doc.setFont("helvetica","normal");
            doc.text("Code: " + (invoiceSale.invoiceNo || "INV-00000000-000000"), 40, y); y += 14;
            doc.text("No.: " + invoiceSeqText, 40, y); y += 14;
            doc.text("Date: " + saleDateText, 40, y); y += 14;
            if(invoiceSale.ref){ doc.text("Reference: " + invoiceSale.ref, 40, y); y += 14; }

            y += 14;
            doc.setFont("helvetica","bold");
            doc.text("Cliente", 40, y);
            doc.text("Repuesto", 300, y);
            y += line;

            doc.setFont("helvetica","normal");
            doc.text(invoiceSale.customer || "Consumidor final", 40, y);
            doc.text(invoiceItem.name || invoiceItem.sku, 300, y); y += 14;
            if(invoiceSale.customerPhone){ doc.text("Tel: " + invoiceSale.customerPhone, 40, y); }
            doc.text("SKU: " + invoiceItem.sku, 300, y); y += 14;
            if(invoiceSale.customerAddress){ doc.text(invoiceSale.customerAddress, 40, y); }
            if(invoiceItem.oem){ doc.text("OEM: " + invoiceItem.oem, 300, y); y += 14; }
            doc.text(((invoiceItem.brand || "") + " " + (invoiceItem.model || "") + " " + (invoiceItem.engine ? "• " + invoiceItem.engine : "")).trim(), 300, y); y += 14;
            if(invoiceItem.category){ doc.text("Categoría: " + invoiceItem.category, 300, y); y += 14; }
            doc.text("Condición: " + (invoiceItem.condition || "—"), 300, y); y += 20;

            doc.setDrawColor(220);
            doc.line(40, y, 555, y); y += 20;

            doc.setFont("helvetica","bold");
            doc.text("Descripción", 40, y);
            doc.text("Cant.", 340, y, { align:"right" });
            doc.text("P. Unit", 435, y, { align:"right" });
            doc.text("Subtotal", 555, y, { align:"right" });
            y += 16;

            function moneyValue(value){
              try{
                return new Intl.NumberFormat("en-US", { style:"currency", currency }).format(Number(value || 0));
              }catch{
                return currency + " " + Number(value || 0).toFixed(2);
              }
            }

            doc.setFont("helvetica","normal");
            doc.text((invoiceItem.name || invoiceItem.sku) + (invoiceItem.condition ? " (" + invoiceItem.condition + ")" : ""), 40, y);
            doc.text(String(invoiceSale.qty || 1), 340, y, { align:"right" });
            doc.text(moneyValue(invoiceSale.unitPrice || 0), 435, y, { align:"right" });
            doc.text(moneyValue(invoiceSale.subtotal || 0), 555, y, { align:"right" });
            y += 20;

            doc.text("IVA / Tax (" + (invoiceSale.taxPercent || 0) + "%)", 435, y, { align:"right" });
            doc.text(moneyValue(invoiceSale.tax || 0), 555, y, { align:"right" });
            y += 20;

            doc.setFont("helvetica","bold");
            doc.text("Total", 435, y, { align:"right" });
            doc.text(moneyValue(invoiceSale.total || 0), 555, y, { align:"right" });
            y += 24;

            if(invoiceSale.saleNotes){
              doc.setFont("helvetica","bold");
              doc.text("Notas", 40, y); y += 16;
              doc.setFont("helvetica","normal");
              const lines = doc.splitTextToSize(invoiceSale.saleNotes, 500);
              doc.text(lines, 40, y);
            }

            doc.save("Invoice-" + (invoiceSale.invoiceNo || "INV-00000000-000000") + "-" + invoiceSeqText + ".pdf");
          };
        <\/script>
      </body>
    </html>
  `);
  w.document.close();
  return w;
}

async function printReceipt(item, sale, isPreview=false){
  return openInvoiceWindow(item, sale, isPreview);
}
async function openSettings(){
  const s = await getSettings();
  els.settingsForm.elements.taxPercent.value = safeNum(s?.taxPercent);
  els.settingsForm.elements.currency.value = s?.currency || "USD";
  els.settingsForm.elements.bizName.value = s?.bizName || "Repuesto PP & Asociado";
  els.settingsForm.elements.bizPhone.value = s?.bizPhone || "(475) 279 1081";
  els.settingsForm.elements.bizRnc.value = s?.bizRnc || "";
  els.settingsForm.elements.bizAddress.value = s?.bizAddress || "C. A &, Santiago de los Caballeros 51000, RD";
  els.settingsForm.elements.adminPin.value = s?.adminPin || "";
  openModal("modalSettings");
}

async function saveSettings(e){
  e.preventDefault();

  const raw = Object.fromEntries(new FormData(els.settingsForm).entries());
  const current = await getSettings();

  await setSettings({
    taxPercent: Math.max(0, safeNum(raw.taxPercent)),
    currency: raw.currency || "USD",
    bizName: (raw.bizName || "").trim() || "Repuesto PP & Asociado",
    bizPhone: (raw.bizPhone || "").trim() || "(475) 279 1081",
    bizRnc: (raw.bizRnc || "").trim(),
    bizAddress: (raw.bizAddress || "").trim() || "C. A &, Santiago de los Caballeros 51000, RD",
    adminPin: (raw.adminPin || "").trim() || current?.adminPin || ""
  });

  markDirty();
  closeModal("modalSettings");
  await refreshAll();
}

async function resetSettings(){
  if(!confirm("Esto restablece solo los ajustes del negocio e impresión. ¿Continuar?")) return;

  const current = await getSettings();
  await setSettings({
    taxPercent: 0,
    currency: "USD",
    bizName: "Repuesto PP & Asociado",
    bizPhone: "(475) 279 1081",
    bizRnc: "",
    bizAddress: "C. A &, Santiago de los Caballeros 51000, RD",
    adminPin: current?.adminPin || ""
  });

  markDirty();
  await openSettings();
}

async function resetAll(){
  const settings = await getSettings();
  if(!settings?.adminPin){
    alert("Primero configura un PIN de administrador.");
    return;
  }

  const pin = prompt("Ingresa el PIN de administrador:");
  if((pin || "").trim() !== String(settings.adminPin)){
    alert("PIN incorrecto.");
    return;
  }

  const typed = prompt("Escribe BORRAR TODO para confirmar:");
  if((typed || "").trim().toUpperCase() !== "BORRAR TODO") return;

  await db.delete();
  location.reload();
}

async function openSales(){
  const settings = await getSettings();
  const currency = settings?.currency || "USD";
  const sales = await db.sales.orderBy("createdAt").reverse().toArray();
  const items = await db.items.toArray();
  const byId = new Map(items.map(i => [i.id, i]));

  const total = sales.reduce((sum,s)=>sum + safeNum(s.total), 0);
  const today = sales
    .filter(s => localDateKey(new Date(s.createdAt)) === todayKey())
    .reduce((sum,s)=>sum + safeNum(s.total), 0);

  els.salesTotal.textContent = money(total, currency);
  els.salesToday.textContent = money(today, currency);
  els.salesCount.textContent = String(sales.length);
  els.salesAvg.textContent = money(sales.length ? total / sales.length : 0, currency);

  const byCategory = new Map();
  for(const sale of sales){
    const item = byId.get(sale.itemId);
    const cat = item?.category || "Sin categoría";
    byCategory.set(cat, (byCategory.get(cat) || 0) + safeNum(sale.total));
  }

  els.salesByCat.innerHTML = Array.from(byCategory.entries())
    .sort((a,b)=>b[1]-a[1])
    .slice(0,10)
    .map(([cat,val])=>`
      <div class="row">
        <div class="k">${escapeHtml(cat)}</div>
        <div class="v">${escapeHtml(money(val, currency))}</div>
      </div>
    `).join("") || `<div class="muted">Sin ventas todavía.</div>`;

  els.salesList.innerHTML = sales.slice(0,30).map(sale=>{
    const item = byId.get(sale.itemId);
    const label = `${sale.saleDateText || new Date(sale.createdAt).toLocaleString("en-US")} • ${item?.name || sale.sku} • x${sale.qty}`;
    return `
      <div class="row">
        <div class="k">${escapeHtml(label)}</div>
        <div class="v">${escapeHtml(money(sale.total, currency))}</div>
      </div>
    `;
  }).join("") || `<div class="muted">Aún no hay despachos registrados.</div>`;

  openModal("modalSales");
}

async function loadClientsData(){
  const sales = await db.sales.orderBy("createdAt").reverse().toArray();
  const grouped = new Map();

  for(const sale of sales){
    const key = normalize(sale.customer || "Consumidor final");
    if(!grouped.has(key)){
      grouped.set(key, {
        key,
        name: sale.customer || "Consumidor final",
        phone: sale.customerPhone || "",
        invoices: []
      });
    }
    grouped.get(key).invoices.push(sale);
  }

  state.clients = Array.from(grouped.values()).sort((a,b)=>a.name.localeCompare(b.name));
}

async function openClients(){
  await loadClientsData();
  els.clientSearch.value = "";
  state.selectedClientKey = null;
  renderClientsList();
  els.clientInvoices.innerHTML = `<div class="muted">Selecciona un cliente para ver sus facturas.</div>`;
  openModal("modalClients");
}

function renderClientsList(){
  const q = normalize(els.clientSearch.value || "");
  let rows = state.clients.slice();

  if(q){
    rows = rows.filter(c=>{
      const hay = [
        c.name,
        c.phone,
        ...c.invoices.flatMap(inv => [
          inv.invoiceNo,
          inv.invoiceSeq,
          inv.ref,
          inv.customer,
          inv.customerPhone,
          inv.customerAddress
        ])
      ].map(normalize).join(" | ");
      return hay.includes(q);
    });
  }

  if(rows.length === 0){
    els.clientsList.innerHTML = `<div class="muted">No se encontraron clientes.</div>`;
    return;
  }

  els.clientsList.innerHTML = rows.map(c=>`
    <div class="clientCard ${state.selectedClientKey===c.key ? "clientCard--active" : ""}" data-client-key="${escapeAttr(c.key)}">
      <div class="clientCard__title">${escapeHtml(c.name)}</div>
      <div class="muted small">${escapeHtml(c.phone || "Sin teléfono")} • ${c.invoices.length} factura${c.invoices.length===1?"":"s"}</div>
    </div>
  `).join("");

  els.clientsList.querySelectorAll("[data-client-key]").forEach(el=>{
    el.addEventListener("click", ()=>{
      state.selectedClientKey = el.dataset.clientKey;
      renderClientsList();
      renderClientInvoices(el.dataset.clientKey);
    });
  });
}

async function renderClientInvoices(clientKey){
  const customer = state.clients.find(c => c.key === clientKey);
  if(!customer){
    els.clientInvoices.innerHTML = `<div class="muted">Cliente no encontrado.</div>`;
    return;
  }

  const items = await db.items.toArray();
  const byId = new Map(items.map(i=>[i.id, i]));
  const settings = await getSettings();
  const currency = settings?.currency || "USD";

  els.clientInvoices.innerHTML = customer.invoices.map(inv=>{
    const item = byId.get(inv.itemId);
    const itemName = item?.name || inv.sku || "Repuesto";
    return `
      <div class="invoiceCard" data-sale-id="${escapeAttr(inv.id)}">
        <div class="invoiceCard__top">
          <div>
            <div class="invoiceCard__title">${escapeHtml(inv.invoiceNo || "INV-00000000-000000")} • No. ${escapeHtml(pad6(inv.invoiceSeq || 1))}</div>
            <div class="muted small">${escapeHtml(inv.saleDateText || new Date(inv.createdAt).toLocaleString("en-US"))}</div>
          </div>
          <div class="invoiceCard__amount">${escapeHtml(money(inv.total, currency))}</div>
        </div>
        <div class="muted small">${escapeHtml(itemName)} • ${escapeHtml(inv.ref || "Sin referencia")}</div>
        <div class="invoiceCard__actions">
          <button class="btn btn--ghost" data-action="open">Ver factura</button>
          <button class="btn btn--ghost" data-action="print">Imprimir</button>
          <button class="btn btn--primary" data-action="pdf">PDF</button>
        </div>
      </div>
    `;
  }).join("") || `<div class="muted">Este cliente aún no tiene facturas.</div>`;

  els.clientInvoices.querySelectorAll(".invoiceCard").forEach(card=>{
    const saleId = card.dataset.saleId;
    card.querySelectorAll("[data-action]").forEach(btn=>{
      btn.addEventListener("click", async ()=>{
        const sale = await db.sales.get(saleId);
        const item = sale ? await db.items.get(sale.itemId) : null;
        if(!sale || !item){
          alert("No se pudo abrir esa factura.");
          return;
        }

        if(btn.dataset.action === "open"){
          openInvoiceWindow(item, sale);
        }else if(btn.dataset.action === "print"){
          const w = openInvoiceWindow(item, sale);
          if(w) w.focus();
        }else if(btn.dataset.action === "pdf"){
          await downloadInvoicePdf(item, sale);
        }
      });
    });
  });
}
async function exportAll(isAuto=false){
  const items = await db.items.toArray();
  const sales = await db.sales.toArray();
  const settings = await getSettings();

  const exportItems = [];
  for(const item of items){
    const copy = { ...item };
    if(item.photo){
      copy.photoDataUrl = await blobToDataURL(item.photo);
      delete copy.photo;
    }
    exportItems.push(copy);
  }

  const payload = {
    app: "Repuesto PP & Asociado - Inventario",
    exportedAt: now(),
    settings,
    items: exportItems,
    sales
  };

  const d = new Date().toISOString().slice(0,10);
  download(`${isAuto ? "autobackup" : "backup"}-aai-inventario-${d}.json`, JSON.stringify(payload));
}

async function importAll(e){
  const file = e.target.files?.[0];
  if(!file) return;

  try{
    const payload = JSON.parse(await file.text());
    if(!Array.isArray(payload?.items)) throw new Error("Archivo inválido.");

    if(!confirm("Esto reemplazará el inventario local con el backup. ¿Deseas continuar?")) return;

    await db.transaction("rw", db.items, db.sales, async ()=>{
      await db.items.clear();
      await db.sales.clear();

      for(const item of payload.items){
        const copy = { ...item };
        if(copy.photoDataUrl){
          copy.photo = dataURLToBlob(copy.photoDataUrl);
          delete copy.photoDataUrl;
        }
        await db.items.put(copy);
      }

      if(Array.isArray(payload.sales)){
        for(const sale of payload.sales){
          await db.sales.put(sale);
        }
      }
    });

    if(payload.settings) await setSettings(payload.settings);
    markDirty();
    await refreshAll();
    alert("Importación completada.");
  }catch(err){
    alert(err.message || "No se pudo importar el archivo.");
  }finally{
    e.target.value = "";
  }
}

window.addEventListener("hashchange", onRoute);

async function onRoute(){
  const m = (location.hash || "").match(/^#\/item\/(.+)$/);
  if(!m){
    showMain();
    return;
  }

  const sku = decodeURIComponent(m[1]);
  const item = await db.items.where("sku").equals(sku).first();
  if(item) openSingle(item);
  else alert("No se encontró ese SKU en esta computadora.");
}

function showMain(){
  document.body.classList.remove("mode-single");
  els.singleView?.classList.add("hidden");
  els.mainApp?.classList.remove("hidden");
}

function openSingle(item){
  state.currentItem = item;
  document.body.classList.add("mode-single");
  els.mainApp?.classList.add("hidden");
  els.singleView?.classList.remove("hidden");

  els.singleTitle.textContent = item.name || item.sku;
  els.singleSubtitle.textContent = `${item.sku}${item.oem ? ` • OEM: ${item.oem}` : ""} • ${item.brand} ${item.model} • ${yearsLabel(item.yearFrom, item.yearTo)}`;

  if(item.photo){
    els.singleMedia.innerHTML = `<img src="${URL.createObjectURL(item.photo)}" alt="">`;
  }else{
    els.singleMedia.innerHTML = `<div class="muted">Sin foto</div>`;
  }

  const rows = [
    ["Categoría", item.category],
    ["Marca", item.brand],
    ["Modelo", item.model],
    ["Motor / Versión", item.engine || "—"],
    ["Años", yearsLabel(item.yearFrom, item.yearTo)],
    ["Ubicación", item.location || "—"],
    ["Estado", item.condition || "—"],
    ["Stock", String(safeNum(item.stock))],
    ["Precio", money(item.price, JSON.parse(localStorage.getItem("rppa_settings") || "{}")?.currency || "USD")],
    ["OEM / Part Number", item.oem || "—"],
    ["Notas", item.notes || "—"]
  ];

  els.singleKV.innerHTML = rows.map(([k,v])=>`
    <div class="row">
      <div class="k">${escapeHtml(k)}</div>
      <div class="v">${escapeHtml(String(v))}</div>
    </div>
  `).join("");
}

function registerSW(){
  if(!("serviceWorker" in navigator)) return;
  window.addEventListener("load", ()=>{
    navigator.serviceWorker.register("./sw.js").catch(()=>{});
  });
}

const META_KEY = "rppa_inv_meta";

function metaGet(){
  try{ return JSON.parse(localStorage.getItem(META_KEY) || "{}") || {}; }
  catch{ return {}; }
}

function metaSet(patch){
  const next = { ...metaGet(), ...patch };
  localStorage.setItem(META_KEY, JSON.stringify(next));
  return next;
}

function todayKey(){
  return localDateKey(new Date());
}

function markDirty(){
  metaSet({ dirty: true, lastChangeAt: now() });
}

function markBackupDoneToday(){
  metaSet({ lastBackupDate: todayKey(), dirty: false });
}

function markBackupPromptedToday(){
  metaSet({ lastPromptDate: todayKey() });
}

function hideAutoBackupBanner(){
  els.autoBackupBar?.classList.add("hidden");
}

async function initAutoBackup(){
  const meta = metaGet();
  const show = meta.dirty && meta.lastBackupDate !== todayKey() && meta.lastPromptDate !== todayKey();
  els.autoBackupBar?.classList.toggle("hidden", !show);
}
let deferredInstallPrompt = null;

function initInstallPrompt(){
  const box = document.getElementById("installPrompt");
  const btnAction = document.getElementById("installPromptAction");
  const btnClose = document.getElementById("installPromptClose");
  const btnLater = document.getElementById("installPromptLater");
  const title = document.getElementById("installPromptTitle");
  const text = document.getElementById("installPromptText");
  const iosHelp = document.getElementById("installPromptIosHelp");

  if(!box || !btnAction || !btnClose || !btnLater || !title || !text || !iosHelp) return;

  const DISMISS_KEY = "rppa_install_prompt_dismissed";
  const CLOSED_TODAY_KEY = "rppa_install_prompt_closed_date";

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isInStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  const today = new Date();
  const todayValue =
    `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;

  function wasClosedToday(){
    return localStorage.getItem(CLOSED_TODAY_KEY) === todayValue;
  }

  function markClosedToday(){
    localStorage.setItem(CLOSED_TODAY_KEY, todayValue);
  }

  function permanentlyDismiss(){
    localStorage.setItem(DISMISS_KEY, "1");
  }

  function isDismissed(){
    return localStorage.getItem(DISMISS_KEY) === "1";
  }

  function showPrompt(){
    if(isDismissed() || wasClosedToday() || isInStandalone) return;
    box.classList.remove("hidden");
  }

  function hidePrompt(){
    box.classList.add("hidden");
  }

  btnClose.addEventListener("click", ()=>{
    markClosedToday();
    hidePrompt();
  });

  btnLater.addEventListener("click", ()=>{
    markClosedToday();
    hidePrompt();
  });

  btnAction.addEventListener("click", async ()=>{
    if(isIOS){
      iosHelp.classList.remove("hidden");
      title.textContent = "Agregar a pantalla de inicio";
      text.textContent = "Safari en iPhone no muestra instalación automática. Hazlo manualmente con estos pasos:";
      return;
    }

    if(!deferredInstallPrompt){
      hidePrompt();
      return;
    }

    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;

    if(choice?.outcome === "accepted"){
      permanentlyDismiss();
      hidePrompt();
    }else{
      markClosedToday();
      hidePrompt();
    }
  });

  window.addEventListener("beforeinstallprompt", (e)=>{
    e.preventDefault();
    deferredInstallPrompt = e;

    if(isInStandalone) return;

    title.textContent = "Instalar app";
    text.textContent = "Instala esta app en tu dispositivo para abrirla más rápido y usarla como aplicación.";
    iosHelp.classList.add("hidden");
    btnAction.textContent = "Instalar";

    showPrompt();
  });

  window.addEventListener("appinstalled", ()=>{
    permanentlyDismiss();
    hidePrompt();
    deferredInstallPrompt = null;
  });

  if(isIOS && !isInStandalone){
    title.textContent = "Agregar a pantalla de inicio";
    text.textContent = "Puedes usar esta app como aplicación en iPhone o iPad.";
    iosHelp.classList.remove("hidden");
    btnAction.textContent = "Ver cómo";
    showPrompt();
  }
}
init();
