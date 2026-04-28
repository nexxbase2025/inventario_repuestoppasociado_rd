function esc(s){
  return (s ?? "").toString()
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function readParam(name){
  return new URLSearchParams(location.search).get(name) || "";
}

function joinYear(yf, yt){
  if(!yf && !yt) return "—";
  return `${yf || "—"}–${yt || "—"}`;
}

function render(){
  const sku = readParam("sku");
  const name = readParam("name");
  const cat = readParam("cat");
  const brand = readParam("brand");
  const model = readParam("model");
  const engine = readParam("engine");
  const yf = readParam("yf");
  const yt = readParam("yt");
  const loc = readParam("loc");
  const oem = readParam("oem");

  const title = name || sku || "Repuesto";
  document.getElementById("t").innerHTML = esc(title);

  const years = joinYear(yf, yt);
  const sub = [
    sku ? `SKU: ${sku}` : "",
    [brand, model].filter(Boolean).join(" "),
    years !== "—" ? `Años: ${years}` : ""
  ].filter(Boolean).join(" • ");

  document.getElementById("sub").innerHTML = esc(sub || "—");

  const badges = [];
  if(cat) badges.push(`<span class="badge badge--gold">${esc(cat)}</span>`);
  if(brand) badges.push(`<span class="badge badge--blue">${esc(brand)}</span>`);
  if(model) badges.push(`<span class="badge">${esc(model)}</span>`);
  document.getElementById("badges").innerHTML = badges.join(" ");

  const rows = [
    ["Ubicación", loc || "—"],
    ["OEM / Part Number", oem || "—"],
    ["Motor / Versión", engine || "—"],
    ["Años", years]
  ];

  document.getElementById("kv").innerHTML = rows.map(([k,v])=>`
    <div class="row">
      <div class="k">${esc(k)}</div>
      <div class="v">${esc(v)}</div>
    </div>
  `).join("");
}

render();
