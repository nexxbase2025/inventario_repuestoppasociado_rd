
const DEFAULT_EURO_BRANDS = [
  "Audi","BMW","Mercedes-Benz","Volkswagen","Porsche","MINI","Land Rover","Jaguar",
  "Volvo","Peugeot","Renault","Citroën","Fiat","Alfa Romeo","Lancia","Maserati",
  "Ferrari","Lamborghini","Bentley","Rolls-Royce","SEAT","Škoda","Opel","Saab"
];

const DEFAULT_CATEGORIES = [
  "Motor","Frenos","Suspensión","Dirección","Carrocería","Eléctrico","Computadora",
  "Enfriamiento","Transmisión","Escape","Encendido","Sensores","Filtros","Iluminación",
  "Aire acondicionado","Interior","Combustible","Tren delantero","Tren trasero","Accesorios"
];

const QUICK_CHIPS = [
  "BMW","Mercedes-Benz","Audi","Volkswagen","Porsche","Frenos","Motor","Eléctrico","Computadora","Suspensión"
];

function money(n, currency="USD"){
  const v = Number(n || 0);
  try{
    return new Intl.NumberFormat("en-US", { style:"currency", currency }).format(v);
  }catch{
    return `${currency} ${v.toFixed(2)}`;
  }
}

function now(){
  return new Date().toISOString();
}

function toLocalInputValue(isoString=null){
  const d = isoString ? new Date(isoString) : new Date();
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0,16);
}

function normalize(str){
  return (str || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function uuid(){
  return crypto?.randomUUID ? crypto.randomUUID() : `id-${Math.random().toString(16).slice(2)}-${Date.now()}`;
}

function escapeHtml(s){
  return (s ?? "").toString()
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function escapeAttr(s){
  return escapeHtml(s).replaceAll("`","&#096;");
}

function yearsLabel(yf, yt){
  if(!yf && !yt) return "—";
  return `${yf || "—"}–${yt || "—"}`;
}

function safeNum(v, fallback=0){
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

async function compressImage(file, opts={}){
  const maxSide = opts.maxSide ?? 1600;
  const quality = opts.quality ?? 0.78;
  const preferWebp = opts.preferWebp ?? true;

  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const targetW = Math.round(width * scale);
  const targetH = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d", { alpha:false });
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);

  let mime = "image/jpeg";
  if(preferWebp){
    const test = canvas.toDataURL("image/webp");
    if(test.startsWith("data:image/webp")) mime = "image/webp";
  }

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, mime, quality));
  if(!blob) throw new Error("No se pudo procesar la imagen.");
  return { blob, size: blob.size, mime, width: targetW, height: targetH };
}

function blobToDataURL(blob){
  return new Promise((resolve,reject)=>{
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function dataURLToBlob(dataURL){
  const [header, base64] = dataURL.split(",");
  const mime = header.match(/data:(.*?);base64/)?.[1] || "application/octet-stream";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function download(filename, text, type="application/json"){
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 500);
}

async function getSettings(){
  try{
    return JSON.parse(localStorage.getItem("rppa_settings") || "null");
  }catch{
    return null;
  }
}

async function setSettings(obj){
  localStorage.setItem("rppa_settings", JSON.stringify(obj));
}
