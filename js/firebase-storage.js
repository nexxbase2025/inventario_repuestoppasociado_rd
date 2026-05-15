// Firebase Storage + Authentication para Inventario Asociado Auto Import LLC
// Este archivo usa Firebase Compat porque el sistema actual NO usa módulos/import.

const firebaseConfig = {
  apiKey: "AIzaSyC-paBnJENaXBUMC9zTdzpBC42NZ2K3o_A",
  authDomain: "repuesto-pp-inventario.firebaseapp.com",
  projectId: "repuesto-pp-inventario",
  storageBucket: "repuesto-pp-inventario.firebasestorage.app",
  messagingSenderId: "61239968093",
  appId: "1:61239968093:web:b2648f1f29a5a7483c68b4"
};

const AUTHORIZED_UID = "c3kaRpRAXQOTAaWWR7uKfpmBJxO2";
const AUTHORIZED_EMAIL = "alexmecanica125@gmail.com";

if(!firebase.apps.length){
  firebase.initializeApp(firebaseConfig);
}

const firebaseAuth = firebase.auth();
const firebaseStorage = firebase.storage();

function normalizeAuthEmail(email){
  return String(email || "").trim().toLowerCase();
}

function showLoginError(message){
  const box = document.getElementById("loginError");
  if(!box) return;
  box.textContent = message || "No se pudo iniciar sesión.";
  box.classList.remove("hidden");
}

function clearLoginError(){
  const box = document.getElementById("loginError");
  if(!box) return;
  box.textContent = "";
  box.classList.add("hidden");
}

function setAuthButtonLoading(isLoading){
  const btn = document.getElementById("loginButton");
  if(!btn) return;
  btn.disabled = Boolean(isLoading);
  btn.textContent = isLoading ? "Entrando..." : "Entrar";
}

function userIsAllowed(user){
  if(!user) return false;
  const emailOk = normalizeAuthEmail(user.email) === normalizeAuthEmail(AUTHORIZED_EMAIL);
  const uidOk = String(user.uid || "") === AUTHORIZED_UID;
  return emailOk && uidOk;
}

function setLoggedOutView(){
  document.body.classList.add("auth-loading");
  document.body.classList.remove("auth-ready");
}

function setLoggedInView(){
  document.body.classList.remove("auth-loading");
  document.body.classList.add("auth-ready");
}

function setupAuthUI(){
  const form = document.getElementById("loginForm");
  const logout = document.getElementById("btnLogout");

  if(form && !form.dataset.bound){
    form.dataset.bound = "1";
    form.addEventListener("submit", async (e)=>{
      e.preventDefault();
      clearLoginError();

      const email = document.getElementById("loginEmail")?.value || "";
      const password = document.getElementById("loginPassword")?.value || "";

      if(normalizeAuthEmail(email) !== normalizeAuthEmail(AUTHORIZED_EMAIL)){
        showLoginError("Este correo no está autorizado para entrar al sistema.");
        return;
      }

      try{
        setAuthButtonLoading(true);
        const cred = await firebaseAuth.signInWithEmailAndPassword(email, password);

        if(!userIsAllowed(cred.user)){
          await firebaseAuth.signOut();
          showLoginError("Usuario no autorizado para este inventario.");
          return;
        }
      }catch(err){
        const code = err?.code || "";
        let msg = "No se pudo iniciar sesión. Revisa el correo y la contraseña.";

        if(code.includes("wrong-password") || code.includes("invalid-credential")) msg = "Contraseña incorrecta o credenciales inválidas.";
        if(code.includes("user-not-found")) msg = "Ese usuario no existe en Firebase Authentication.";
        if(code.includes("too-many-requests")) msg = "Demasiados intentos. Espera un momento e intenta otra vez.";

        showLoginError(msg);
      }finally{
        setAuthButtonLoading(false);
      }
    });
  }

  if(logout && !logout.dataset.bound){
    logout.dataset.bound = "1";
    logout.addEventListener("click", async ()=>{
      await firebaseAuth.signOut();
      location.reload();
    });
  }
}

function waitForInventoryAuth(){
  setupAuthUI();

  return new Promise((resolve)=>{
    const unsubscribe = firebaseAuth.onAuthStateChanged(async (user)=>{
      setupAuthUI();

      if(userIsAllowed(user)){
        clearLoginError();
        setLoggedInView();
        unsubscribe();
        resolve(user);
        return;
      }

      if(user){
        await firebaseAuth.signOut();
        showLoginError("Usuario no autorizado para este inventario.");
      }

      setLoggedOutView();
    });
  });
}

async function uploadInventoryImage(blob, itemId, sku = "sin-sku") {
  if (!blob) return null;

  const user = firebaseAuth.currentUser;
  if(!userIsAllowed(user)){
    throw new Error("Debes iniciar sesión con el usuario autorizado antes de subir imágenes.");
  }

  const cleanSku = String(sku || "sin-sku")
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .slice(0, 80);

  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  const fileName = `${Date.now()}-${cleanSku}.${ext}`;
  const path = `inventario/${user.uid}/${itemId}/${fileName}`;

  const ref = firebaseStorage.ref(path);

  await ref.put(blob, {
    contentType: blob.type || "image/jpeg"
  });

  const url = await ref.getDownloadURL();

  return {
    photoUrl: url,
    photoPath: path
  };
}
