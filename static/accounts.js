/* Prompt Library Accounts
 * Local-first account layer.
 * Accounts are scoped to this browser/device until a remote auth adapter is configured.
 * No password is stored in plaintext.
 */
(function () {
  "use strict";
  const STORAGE_KEY = "pl_accounts_v1";
  const SESSION_KEY = "pl_session_v1";

  const readAccounts = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch (_) { return {}; }
  };
  const writeAccounts = accounts => localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
  const normaliseName = value => String(value || "").trim().replace(/\s+/g, " ").slice(0, 48);
  const keyForName = name => normaliseName(name).toLowerCase();

  async function hashPassword(password, salt) {
    const data = new TextEncoder().encode(salt + ":" + password);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
  }

  function getSession() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); } catch (_) { return null; }
  }
  function setSession(account) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id: account.id, name: account.name, signedInAt: new Date().toISOString() }));
  }
  function clearSession() { sessionStorage.removeItem(SESSION_KEY); }

  function injectStyles() {
    if (document.getElementById("plAccountStyles")) return;
    const style = document.createElement("style");
    style.id = "plAccountStyles";
    style.textContent = `
      #plAccountGate{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:24px;background:var(--bg,#f4f4f0)}
      #plAccountGate[hidden]{display:none}
      .pl-auth-card{width:min(430px,100%);padding:30px;border-radius:24px;background:var(--surface,#fff);border:1px solid var(--border,rgba(0,0,0,.09));box-shadow:0 24px 80px rgba(0,0,0,.14)}
      .pl-auth-brand{display:flex;align-items:center;gap:12px;margin-bottom:24px}.pl-auth-brand img{width:42px;height:42px;object-fit:contain}
      .pl-auth-kicker{font:700 11px/1 var(--font-mono,monospace);letter-spacing:.12em;text-transform:uppercase;opacity:.58}
      .pl-auth-title{margin:7px 0 8px;font:800 27px/1.1 var(--font-display,sans-serif)}.pl-auth-copy{margin:0 0 22px;opacity:.68;font-size:14px;line-height:1.55}
      .pl-auth-tabs{display:grid;grid-template-columns:1fr 1fr;gap:5px;padding:4px;border-radius:12px;background:rgba(127,127,127,.09);margin-bottom:20px}
      .pl-auth-tabs button{border:0;border-radius:9px;padding:10px;background:transparent;color:inherit;cursor:pointer;font:600 12px var(--font-mono,monospace)}
      .pl-auth-tabs button.active{background:var(--surface,#fff);box-shadow:0 2px 8px rgba(0,0,0,.08)}
      .pl-auth-field{margin-bottom:14px}.pl-auth-field label{display:block;margin-bottom:7px;font:700 11px var(--font-mono,monospace);text-transform:uppercase;letter-spacing:.08em;opacity:.65}
      .pl-auth-field input{width:100%;box-sizing:border-box;border:1px solid var(--border,rgba(0,0,0,.12));border-radius:11px;padding:12px 13px;background:transparent;color:inherit;font:inherit;outline:none}
      .pl-auth-field input:focus{border-color:var(--accent,#6d5dfc);box-shadow:0 0 0 3px rgba(109,93,252,.12)}
      .pl-auth-submit{width:100%;border:0;border-radius:12px;padding:13px 16px;cursor:pointer;background:var(--accent,#6d5dfc);color:#fff;font-weight:800}
      .pl-auth-message{min-height:20px;margin:12px 0 0;font-size:12px;color:#b42318}
      .pl-auth-note{margin-top:17px;padding-top:15px;border-top:1px solid var(--border,rgba(0,0,0,.08));font-size:11px;line-height:1.5;opacity:.55}
      .pl-device-modal{position:fixed;inset:0;z-index:100000;display:grid;place-items:center;padding:20px;background:rgba(0,0,0,.45);backdrop-filter:blur(7px)}
      .pl-device-modal[hidden]{display:none}.pl-device-card{width:min(470px,100%);padding:26px;border-radius:22px;background:var(--surface,#fff);color:var(--text,#111);box-shadow:0 28px 90px rgba(0,0,0,.25)}
      .pl-device-card h2{margin:0 0 7px}.pl-device-card p{opacity:.68;font-size:13px;line-height:1.55}.pl-device-qr{width:220px;height:220px;margin:20px auto;display:grid;place-items:center;background:#fff;border-radius:16px;padding:12px;box-sizing:border-box}.pl-device-qr canvas{max-width:100%;max-height:100%}
      .pl-device-url{padding:10px 12px;border-radius:10px;background:rgba(127,127,127,.09);font:11px/1.45 var(--font-mono,monospace);word-break:break-all}.pl-device-actions{display:flex;gap:8px;margin-top:14px}.pl-device-actions button{flex:1;padding:11px;border-radius:10px;border:1px solid var(--border,rgba(0,0,0,.1));background:transparent;color:inherit;cursor:pointer}
    `;
    document.head.appendChild(style);
  }

  function createGate() {
    if (document.getElementById("plAccountGate")) return;
    const gate = document.createElement("div");
    gate.id = "plAccountGate";
    gate.innerHTML = `
      <section class="pl-auth-card" role="dialog" aria-labelledby="plAuthTitle">
        <div class="pl-auth-brand"><img src="/static/logo-mark.png" alt=""><div><div class="pl-auth-kicker">Prompt Library</div><div style="font-weight:800">Private workspace</div></div></div>
        <h1 class="pl-auth-title" id="plAuthTitle">Sign in to your library</h1>
        <p class="pl-auth-copy">Use an account name and password to control access to this Prompt Library.</p>
        <div class="pl-auth-tabs"><button type="button" data-auth-mode="signin" class="active">Sign in</button><button type="button" data-auth-mode="signup">Create account</button></div>
        <form id="plAuthForm">
          <div class="pl-auth-field"><label for="plAccountName">Account name</label><input id="plAccountName" autocomplete="username" maxlength="48" required></div>
          <div class="pl-auth-field"><label for="plAccountPassword">Password</label><input id="plAccountPassword" type="password" autocomplete="current-password" minlength="8" required></div>
          <div class="pl-auth-field" id="plConfirmWrap" hidden><label for="plAccountConfirm">Confirm password</label><input id="plAccountConfirm" type="password" autocomplete="new-password" minlength="8"></div>
          <button class="pl-auth-submit" id="plAuthSubmit" type="submit">Sign in</button>
          <div class="pl-auth-message" id="plAuthMessage" role="alert"></div>
        </form>
        <div class="pl-auth-note">Local-first mode: credentials are stored as a salted hash in this browser. The account UI is ready for a server-backed authentication adapter.</div>
      </section>`;
    document.body.prepend(gate);
  }

  function setGate(visible) {
    const gate = document.getElementById("plAccountGate");
    if (gate) gate.hidden = !visible;
    document.documentElement.classList.toggle("pl-auth-locked", visible);
  }

  function wireAuth() {
    let mode = "signin";
    const form = document.getElementById("plAuthForm"), name = document.getElementById("plAccountName");
    const password = document.getElementById("plAccountPassword"), confirm = document.getElementById("plAccountConfirm");
    const confirmWrap = document.getElementById("plConfirmWrap"), submit = document.getElementById("plAuthSubmit"), message = document.getElementById("plAuthMessage");

    document.querySelectorAll("[data-auth-mode]").forEach(btn => btn.addEventListener("click", () => {
      mode = btn.dataset.authMode;
      document.querySelectorAll("[data-auth-mode]").forEach(x => x.classList.toggle("active", x === btn));
      confirmWrap.hidden = mode !== "signup"; confirm.required = mode === "signup";
      submit.textContent = mode === "signup" ? "Create account" : "Sign in"; message.textContent = "";
      password.autocomplete = mode === "signup" ? "new-password" : "current-password";
    }));

    form.addEventListener("submit", async e => {
      e.preventDefault(); message.textContent = "";
      const accountName = normaliseName(name.value), passwordValue = password.value;
      if (accountName.length < 2) return void (message.textContent = "Account name must be at least 2 characters.");
      if (passwordValue.length < 8) return void (message.textContent = "Password must be at least 8 characters.");
      const accounts = readAccounts(), key = keyForName(accountName);

      if (mode === "signup") {
        if (accounts[key]) return void (message.textContent = "That account name is already in use on this device.");
        if (passwordValue !== confirm.value) return void (message.textContent = "Passwords do not match.");
        const salt = crypto.randomUUID(), record = {id:crypto.randomUUID(),name:accountName,salt,hash:await hashPassword(passwordValue,salt),createdAt:new Date().toISOString()};
        accounts[key] = record; writeAccounts(accounts); setSession(record); setGate(false);
        window.dispatchEvent(new CustomEvent("pl:account-signed-in",{detail:{id:record.id,name:record.name}})); return;
      }

      const record = accounts[key];
      if (!record) return void (message.textContent = "Account not found on this device.");
      if (await hashPassword(passwordValue,record.salt) !== record.hash) return void (message.textContent = "Incorrect account name or password.");
      setSession(record); setGate(false); window.dispatchEvent(new CustomEvent("pl:account-signed-in",{detail:{id:record.id,name:record.name}}));
    });
  }

  function addAccountMenu() {
    if (document.getElementById("plAccountMenu")) return;
    const host = document.querySelector("#contentHeader .header-top"); if (!host) return;
    const menu = document.createElement("div"); menu.id = "plAccountMenu";
    menu.innerHTML = '<span id="plAccountNameBadge" style="font:700 11px var(--font-mono,monospace);opacity:.7"></span><button type="button" id="plSignOutBtn" title="Sign out" aria-label="Sign out"><span class="material-symbols-outlined">logout</span></button>';
    host.appendChild(menu);
    const current = getSession(); document.getElementById("plAccountNameBadge").textContent = current ? current.name : "";
    document.getElementById("plSignOutBtn").addEventListener("click", () => { clearSession(); setGate(true); });
  }

  function deviceUrl() {
    const url = new URL(window.location.href); url.searchParams.set("device","phone");
    const current = getSession(); if (current) url.searchParams.set("account",current.name);
    return url.toString();
  }

  function openDeviceModal() {
    let modal = document.getElementById("plDeviceModal");
    if (!modal) {
      modal=document.createElement("div"); modal.id="plDeviceModal"; modal.className="pl-device-modal"; modal.hidden=true;
      modal.innerHTML='<section class="pl-device-card" role="dialog" aria-modal="true" aria-labelledby="plDeviceTitle"><h2 id="plDeviceTitle">Connect another device</h2><p>Scan this code with your phone. It opens Prompt Library in the phone\'s normal browser. There is no second app to install.</p><div class="pl-device-qr" id="plDeviceQr"></div><div class="pl-device-url" id="plDeviceUrl"></div><div class="pl-device-actions"><button type="button" id="plCopyDeviceLink">Copy link</button><button type="button" id="plCloseDevice">Close</button></div><p style="font-size:11px;margin-bottom:0">A localhost address cannot be reached from another device. Use a network-accessible or hosted Prompt Library URL.</p></section>';
      document.body.appendChild(modal);
      document.getElementById("plCloseDevice").onclick=()=>modal.hidden=true;
      document.getElementById("plCopyDeviceLink").onclick=async()=>{try{await navigator.clipboard.writeText(document.getElementById("plDeviceUrl").textContent)}catch(_){}};
      modal.addEventListener("click",e=>{if(e.target===modal)modal.hidden=true});
    }
    const url=deviceUrl(); document.getElementById("plDeviceUrl").textContent=url;
    const qr=document.getElementById("plDeviceQr"); qr.innerHTML="";
    if(window.QRCode){try{new QRCode(qr,{text:url,width:196,height:196,correctLevel:QRCode.CorrectLevel.M})}catch(_){qr.textContent="QR unavailable. Use Copy link."}}else qr.textContent="QR unavailable. Use Copy link.";
    modal.hidden=false;
  }

  function wireDeviceHandoff() {
    const btn=document.getElementById("phoneShareBtn"); if(!btn||btn.dataset.plWired)return;
    btn.dataset.plWired="1"; btn.addEventListener("click",openDeviceModal);
    btn.title="Open Prompt Library on another device";
    const label=btn.querySelector("span:last-child"); if(label)label.textContent="Connect device";
  }

  function init() {
    injectStyles(); createGate(); wireAuth(); setGate(!getSession());
    setTimeout(()=>{addAccountMenu();wireDeviceHandoff()},0);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init); else init();
  window.PL_Accounts={current:getSession,signOut:()=>{clearSession();setGate(true)},connectDevice:openDeviceModal};
})();