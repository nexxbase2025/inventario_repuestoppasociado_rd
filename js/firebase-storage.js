// Firebase: Auth + Storage + Firestore para Inventario Repuesto PP & Asociado
// Usa SDK Compat porque este proyecto trabaja con scripts normales, no módulos/import.

const FIREBASE_ALLOWED_UID = "c3kaRpRAXQOTAaWWR7uKfpmBJxO2";

const firebaseConfig = {
  apiKey: "AIzaSyC-paBnJENaXBUMC9zTdzpBC42NZ2K3o_A",
  authDomain: "repuesto-pp-inventario.firebaseapp.com",
  projectId: "repuesto-pp-inventario",
  storageBucket: "repuesto-pp-inventario.firebasestorage.app",
  messagingSenderId: "61239968093",
  appId: "1:61239968093:web:b2648f1f29a5a7483c68b4"
};

firebase.initializeApp(firebaseConfig);

const firebaseAuth = firebase.auth();
const firebaseStorage = firebase.storage();
const firebaseFirestore = firebase.firestore();

firebaseAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(()=>{});

function firebaseCleanObject(value){
  if(value instanceof Blob) return undefined;
  if(Array.isArray(value)) return value.map(firebaseCleanObject).filter(v => v !== undefined);
  if(value && typeof value === "object"){
    const out = {};
    for(const [k,v] of Object.entries(value)){
      const clean = firebaseCleanObject(v);
      if(clean !== undefined) out[k] = clean;
    }
    return out;
  }
  return value === undefined ? null : value;
}

function firebaseOwnerOk(user){
  return Boolean(user && user.uid === FIREBASE_ALLOWED_UID);
}

function injectAuthUI(){
  if(document.getElementById("authGate")) return;
  const box = document.createElement("div");
  box.id = "authGate";
  box.className = "authGate";
  box.innerHTML = `
    <div class="authCard">
      <div class="authLogo">🔐</div>
      <h1>Acceso al inventario</h1>
      <p>Inicia sesión para administrar y sincronizar el inventario.</p>
      <form id="authForm" autocomplete="off">
        <label>Correo electrónico</label>
        <input id="authEmail" type="email" autocomplete="username" placeholder="correo@ejemplo.com" required />
        <label>Contraseña</label>
        <div class="authPasswordWrap">
          <input id="authPassword" type="password" autocomplete="current-password" placeholder="Contraseña" required />
          <button id="authTogglePassword" type="button" aria-label="Ver contraseña">👁</button>
        </div>
        <button id="authSubmit" type="submit">Entrar</button>
        <div id="authError" class="authError"></div>
      </form>
    </div>`;
  document.body.appendChild(box);

  const form = document.getElementById("authForm");
  const email = document.getElementById("authEmail");
  const pass = document.getElementById("authPassword");
  const err = document.getElementById("authError");
  const toggle = document.getElementById("authTogglePassword");

  email.value = "";
  pass.value = "";

  toggle.addEventListener("click", ()=>{
    const visible = pass.type === "text";
    pass.type = visible ? "password" : "text";
    toggle.textContent = visible ? "👁" : "🙈";
  });

  form.addEventListener("submit", async (e)=>{
    e.preventDefault();
    err.textContent = "";
    const btn = document.getElementById("authSubmit");
    btn.disabled = true;
    btn.textContent = "Entrando...";
    try{
      const cred = await firebaseAuth.signInWithEmailAndPassword(email.value.trim(), pass.value);
      if(!firebaseOwnerOk(cred.user)){
        await firebaseAuth.signOut();
        throw new Error("Este usuario no está autorizado para este inventario.");
      }
    }catch(ex){
      err.textContent = ex?.message || "No se pudo iniciar sesión.";
    }finally{
      btn.disabled = false;
      btn.textContent = "Entrar";
    }
  });
}

function setAppLocked(locked){
  document.body.classList.toggle("appLocked", locked);
  const gate = document.getElementById("authGate");
  if(gate) gate.classList.toggle("hidden", !locked);
}

function addLogoutButton(){
  if(document.getElementById("btnLogout")) return;
  const actions = document.querySelector(".topbar__actions");
  if(!actions) return;
  const btn = document.createElement("button");
  btn.id = "btnLogout";
  btn.className = "btn btn--ghost";
  btn.type = "button";
  btn.textContent = "Salir";
  btn.addEventListener("click", ()=>firebaseAuth.signOut());
  actions.appendChild(btn);
}

function waitForAuthorizedUser(){
  injectAuthUI();
  setAppLocked(true);
  return new Promise((resolve)=>{
    firebaseAuth.onAuthStateChanged(async (user)=>{
      if(firebaseOwnerOk(user)){
        setAppLocked(false);
        addLogoutButton();
        resolve(user);
      }else{
        setAppLocked(true);
        if(user) await firebaseAuth.signOut();
      }
    });
  });
}

async function uploadInventoryImage(blob, itemId, sku = "sin-sku") {
  if (!blob) return null;
  const user = firebaseAuth.currentUser;
  if(!firebaseOwnerOk(user)) throw new Error("Debes iniciar sesión para subir imágenes.");

  const cleanSku = String(sku || "sin-sku")
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .slice(0, 80);

  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  const fileName = `${Date.now()}-${cleanSku}.${ext}`;
  const path = `inventario/${itemId}/${fileName}`;
  const ref = firebaseStorage.ref(path);

  await ref.put(blob, { contentType: blob.type || "image/jpeg" });
  const url = await ref.getDownloadURL();
  return { photoUrl: url, photoPath: path };
}

async function cloudLoadItems(){
  const snap = await firebaseFirestore.collection("inventario").orderBy("updatedAt", "desc").get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data(), photo: null }));
}

async function cloudSaveItem(item){
  if(!item?.id) return;
  const clean = firebaseCleanObject({ ...item, photo: undefined });
  await firebaseFirestore.collection("inventario").doc(item.id).set(clean, { merge: true });
}

async function cloudDeleteItem(id){
  if(!id) return;
  await firebaseFirestore.collection("inventario").doc(id).delete();
}

async function cloudLoadSales(){
  const snap = await firebaseFirestore.collection("ventas").orderBy("createdAt", "desc").get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function cloudSaveSale(sale){
  if(!sale?.id) return;
  await firebaseFirestore.collection("ventas").doc(sale.id).set(firebaseCleanObject(sale), { merge: true });
}

async function cloudLoadSettings(){
  const doc = await firebaseFirestore.collection("ajustes").doc("general").get();
  return doc.exists ? doc.data() : null;
}

async function cloudSaveSettings(settings){
  await firebaseFirestore.collection("ajustes").doc("general").set(firebaseCleanObject(settings || {}), { merge: true });
}

async function cloudClearAllData(){
  const cols = ["inventario", "ventas"];
  for(const col of cols){
    const snap = await firebaseFirestore.collection(col).get();
    const batch = firebaseFirestore.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    if(!snap.empty) await batch.commit();
  }
}

async function syncCloudToLocal(){
  const [items, sales, settings] = await Promise.all([
    cloudLoadItems().catch(()=>null),
    cloudLoadSales().catch(()=>null),
    cloudLoadSettings().catch(()=>null)
  ]);

  if(Array.isArray(items)){
    await db.items.clear();
    for(const item of items) await db.items.put({ ...item, photo: null });
  }

  if(Array.isArray(sales)){
    await db.sales.clear();
    for(const sale of sales) await db.sales.put(sale);
  }

  if(settings) await setSettings(settings);
}

async function cloudReplaceAllFromLocal(){
  const [items, sales, settings] = await Promise.all([
    db.items.toArray(),
    db.sales.toArray(),
    getSettings()
  ]);

  await cloudClearAllData();
  for(const item of items) await cloudSaveItem(item);
  for(const sale of sales) await cloudSaveSale(sale);
  if(settings) await cloudSaveSettings(settings);
}
