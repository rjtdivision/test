import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, setPersistence, inMemoryPersistence }
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

// Paste the Web app URL of userapi.gs here
const USER_API = "https://script.google.com/macros/s/AKfycbyR_GqILVf5dm091391BXyxP4KqgyZk01f6FF6439cK4upXe7XEIBUt7FWdsSSmK78_xA/exec";

const auth = getAuth(initializeApp({
  apiKey: "AIzaSyCVVp1dd4OCEhXgyGVmKMjQNswKvX6oPqU",
  authDomain: "login-4ef9c.firebaseapp.com",
  projectId: "login-4ef9c",
  appId: "1:675553256314:web:de2fa268c867bbe0252cc3"
}));
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

window.USER = null;
window.stnOk = d => !window.USER || String((d && d.STATION_TO) || "").trim().toUpperCase() === window.USER.station;

const css = `#authO{position:fixed;inset:0;z-index:9;background:var(--bg);color:var(--text);display:flex;align-items:center;justify-content:center;padding:20px;overflow:auto;font-family:inherit}
#authO .ac{width:100%;max-width:400px;background:var(--surface);border:1px solid var(--line);border-top:4px solid var(--cyan);border-radius:20px;padding:26px 20px;display:flex;flex-direction:column;gap:14px;box-shadow:0 10px 30px rgba(0,40,100,.15)}
#authO h2{margin:0;font-size:18px;letter-spacing:.14em;text-align:center}
#authO p{margin:0;font-size:12px;font-weight:700;letter-spacing:.08em;color:var(--muted);text-align:center;word-break:break-all}
#authT{position:absolute;top:14px;right:14px;width:40px;height:40px;border-radius:50%;border:1px solid var(--line);background:var(--surface);color:var(--text);font-size:18px;cursor:pointer}`;
document.head.appendChild(Object.assign(document.createElement("style"), { textContent: css }));

const O = document.createElement("div");
O.id = "authO";
O.innerHTML = '<button type="button" id="authT" aria-label="Change theme">&#9788;</button><div class="ac" id="authC"></div>';
document.body.appendChild(O);
const C = O.querySelector("#authC");
O.querySelector("#authT").onclick = () => document.getElementById("themeBtn").click();

const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const msg = (t, e) => { const m = C.querySelector(".umsg"); if (m) { m.textContent = t; m.className = "umsg" + (e ? " err" : ""); } };
const errText = e => (e && e.message && e.message.indexOf("SRV:") === 0) ? e.message.slice(4).toUpperCase().slice(0, 90) : "CHECK INTERNET AND TRY AGAIN";
const authErr = e => ({
  "auth/popup-closed-by-user": "SIGN-IN CANCELLED - TRY AGAIN",
  "auth/popup-blocked": "POPUP BLOCKED - ALLOW POPUPS FOR THIS SITE",
  "auth/unauthorized-domain": "THIS DOMAIN IS NOT AUTHORISED IN FIREBASE"
}[e && e.code] || errText(e));
const ready = () => /^https:\/\//.test(USER_API);
const post = b => fetch(USER_API, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(b) })
  .then(r => r.json()).then(j => { if (!j || !j.ok) throw new Error("SRV:" + ((j && j.error) || "failed")); return j; });

function done(u) {
  window.USER = u;
  O.remove();
  const t = document.querySelector("header .t");
  if (t) {
    const s = document.createElement("small");
    s.style.cssText = "white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%";
    s.textContent = "STATION: " + u.station + " | " + u.email;
    t.appendChild(s);
  }
}
async function other() { try { await signOut(auth); } catch (e) {} viewLogin(); }

function viewLogin() {
  C.innerHTML = '<h2>SIGN IN</h2><p>USE YOUR GMAIL ACCOUNT</p><button type="button" class="gbtn pri" id="g">SIGN IN WITH GOOGLE</button><div class="umsg"></div>';
  C.querySelector("#g").onclick = async function () {
    const b = this; b.disabled = true; msg("");
    if (!ready()) { msg("USER SHEET NOT CONNECTED", true); b.disabled = false; return; }
    try {
      await setPersistence(auth, inMemoryPersistence);
      const r = await signInWithPopup(auth, provider);
      msg("CHECKING ACCOUNT...");
      const j = await post({ action: "status", idToken: await r.user.getIdToken() });
      j.registered ? viewPass(r.user) : viewReg(r.user);
    } catch (e) { msg(authErr(e), true); b.disabled = false; }
  };
}

function viewPass(u) {
  C.innerHTML = '<h2>WELCOME BACK</h2><p>' + esc(u.email) + '</p><div class="fld"><div class="stl">PASSWORD</div><input id="pw" class="gin" type="password" autocomplete="current-password" maxlength="64"></div><div class="umsg"></div><button type="button" class="gbtn pri" id="ok">LOGIN</button><button type="button" class="gbtn" id="sw">USE ANOTHER ACCOUNT</button>';
  C.querySelector("#sw").onclick = other;
  const pw = C.querySelector("#pw");
  pw.onkeydown = e => { if (e.key === "Enter") C.querySelector("#ok").click(); };
  C.querySelector("#ok").onclick = async function () {
    if (!pw.value) { msg("ENTER YOUR PASSWORD", true); return; }
    const b = this; b.disabled = true; msg("CHECKING...");
    try {
      const j = await post({ action: "login", idToken: await u.getIdToken(true), password: pw.value });
      done(j.user);
    } catch (e) { msg(errText(e), true); b.disabled = false; }
  };
}

function viewReg(u) {
  C.innerHTML = '<h2>CREATE ACCOUNT</h2><p>' + esc(u.email) + '</p>'
    + '<div class="fld"><div class="stl">SET PASSWORD (MIN. 8, LETTERS + NUMBERS)</div><input id="p1" class="gin" type="password" autocomplete="new-password" maxlength="64"></div>'
    + '<div class="fld"><div class="stl">CONFIRM PASSWORD</div><input id="p2" class="gin" type="password" autocomplete="new-password" maxlength="64"></div>'
    + '<div class="fld"><div class="stl">SELECT YOUR STATION</div><select id="sn" class="gin" disabled><option value="" selected disabled>LOADING...</option></select></div>'
    + '<div class="umsg"></div><button type="button" class="gbtn pri" id="ok">REGISTER</button><button type="button" class="gbtn" id="sw">USE ANOTHER ACCOUNT</button>';
  C.querySelector("#sw").onclick = other;
  fetch(USER_API + "?action=stations&t=" + Date.now()).then(r => r.json()).then(j => {
    if (!j || !j.ok) throw new Error("SRV:" + ((j && j.error) || "failed"));
    const s = C.querySelector("#sn"); if (!s) return;
    if (!j.stations.length) { s.innerHTML = '<option value="" selected disabled>NO STATION</option>'; msg("NO STATION PROFILE FOUND - ASK ADMIN TO CREATE ONE", true); return; }
    s.innerHTML = '<option value="" selected disabled>SELECT STATION</option>' + j.stations.map(x => '<option value="' + esc(x.code) + '">' + esc(x.code + " - " + x.name) + "</option>").join("");
    s.disabled = false;
  }).catch(e => msg("STATIONS NOT LOADED - " + errText(e), true));
  C.querySelector("#ok").onclick = async function () {
    const p1 = C.querySelector("#p1").value, p2 = C.querySelector("#p2").value, sn = C.querySelector("#sn").value;
    if (p1.length < 8 || !/[A-Za-z]/.test(p1) || !/\d/.test(p1)) { msg("PASSWORD: MIN. 8 CHARACTERS WITH LETTERS AND NUMBERS", true); return; }
    if (p1 !== p2) { msg("PASSWORDS DO NOT MATCH", true); return; }
    if (!sn) { msg("SELECT YOUR STATION", true); return; }
    const b = this; b.disabled = true; msg("SAVING...");
    try {
      const j = await post({ action: "register", idToken: await u.getIdToken(true), password: p1, station: sn });
      done(j.user);
    } catch (e) { msg(errText(e), true); b.disabled = false; }
  };
}

viewLogin();
