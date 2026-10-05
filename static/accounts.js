/* Prompt Library Accounts v2
 * Server-authenticated accounts with isolated SQLite stores.
 * No passwords, recovery codes, or session tokens are stored client-side.
 */
(function () {
  "use strict";

  const RAW_KEYS = new Set(["pl_accounts_v1", "pl_session_v1", "pl_active_account_id"]);
  const ACCOUNT_KEY = "pl_active_account_id";
  let activeId = null;
  try { activeId = Storage.prototype.getItem.call(localStorage, ACCOUNT_KEY) || null; } catch (_) {}
  let booted = false;

  function api(url, options = {}) {
    return fetch(url, {
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options
    });
  }

  function scopedKey(key) {
    if (RAW_KEYS.has(key) || String(key).startsWith("pl_auth_")) return key;
    return activeId ? "pl:" + activeId + ":" + key : "pl:anonymous:" + key;
  }

  function patchStorage() {
    const proto = Storage.prototype;
    if (proto.__plAccountScoped) return;
    proto.__plAccountScoped = true;
    const rawGet = proto.getItem, rawSet = proto.setItem, rawRemove = proto.removeItem;
    proto.getItem = function (key) { return rawGet.call(this, scopedKey(key)); };
    proto.setItem = function (key, value) { return rawSet.call(this, scopedKey(key), value); };
    proto.removeItem = function (key) { return rawRemove.call(this, scopedKey(key)); };
  }

  function setActive(account) {
    activeId = account?.id || null;
    try {
      if (activeId) localStorage.setItem(ACCOUNT_KEY, activeId);
      else localStorage.removeItem(ACCOUNT_KEY);
    } catch (_) {}
    window.dispatchEvent(new CustomEvent("pl:account-changed", { detail: account || null }));
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[ch]));
  }

  function injectStyles() {
    if (document.getElementById("plAccountStylesV2")) return;
    const style = document.createElement("style");
    style.id = "plAccountStylesV2";
    style.textContent = `
      #plAccountGate{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:28px;background:var(--bg,#f4f1e9);color:var(--ink,#171716)}
      #plAccountGate[hidden]{display:none}
      .pl-auth-card{width:min(760px,100%);padding:30px;border:1px solid var(--line,rgba(0,0,0,.1));border-radius:26px;background:var(--surface,#fff);box-shadow:0 28px 90px rgba(0,0,0,.16)}
      .pl-auth-top{display:flex;align-items:center;justify-content:space-between;gap:18px}.pl-auth-brand{display:flex;align-items:center;gap:12px}.pl-auth-brand img{width:42px;height:42px}
      .pl-auth-kicker{font:700 10px/1 var(--font-mono,monospace);letter-spacing:.14em;text-transform:uppercase;opacity:.55}.pl-auth-title{margin:8px 0 6px;font:800 30px/1.08 var(--font-display,Georgia,serif)}.pl-auth-copy{margin:0 0 22px;max-width:58ch;color:var(--ink-2,#666)}
      .pl-profile-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin:18px 0}.pl-profile{min-height:150px;border:1px solid var(--line,rgba(0,0,0,.1));border-radius:18px;background:var(--surface-2,#f7f6f1);padding:18px 12px;display:grid;place-items:center;gap:8px;color:inherit;cursor:pointer;transition:transform .16s,border-color .16s,box-shadow .16s}.pl-profile:hover{transform:translateY(-2px);border-color:var(--accent,#138f90);box-shadow:0 12px 30px rgba(0,0,0,.09)}.pl-profile-avatar{width:72px;height:72px;border-radius:50%;display:grid;place-items:center;background:var(--accent-soft,#d9eeee);color:var(--accent,#138f90);font:800 28px var(--font-display,Georgia,serif)}.pl-profile-name{font-weight:800}.pl-profile-sub{font-size:11px;opacity:.55}
      .pl-auth-actions{display:flex;gap:9px;flex-wrap:wrap}.pl-btn{border:1px solid var(--line,rgba(0,0,0,.12));border-radius:11px;padding:11px 14px;background:transparent;color:inherit;font-weight:700;cursor:pointer}.pl-btn.primary{background:var(--accent,#138f90);border-color:var(--accent,#138f90);color:#fff}.pl-btn.danger{color:var(--danger,#b42318)}
      .pl-auth-form{display:grid;gap:13px;margin-top:18px}.pl-field label{display:block;font:700 10px var(--font-mono,monospace);text-transform:uppercase;letter-spacing:.08em;opacity:.62;margin-bottom:6px}.pl-field input,.pl-field select{width:100%;box-sizing:border-box;border:1px solid var(--line,rgba(0,0,0,.12));border-radius:11px;padding:12px;background:var(--surface-sunk,#fafafa);color:inherit}.pl-field input:focus{outline:2px solid var(--accent,#138f90);outline-offset:2px}.pl-message{min-height:20px;font-size:12px;color:var(--danger,#b42318)}.pl-recovery{padding:14px;border-radius:14px;background:var(--warn-soft,#fff4d7);border:1px solid var(--warn,#c98b00);font:700 12px/1.5 var(--font-mono,monospace);word-break:break-all}.pl-recovery strong{display:block;font:800 16px var(--font-mono,monospace);margin-top:6px}
      #plAccountMenuV2{display:flex;align-items:center;gap:7px;margin-left:auto}.pl-current-profile{display:flex;align-items:center;gap:8px;padding:5px 9px;border:1px solid var(--line,rgba(0,0,0,.1));border-radius:12px;background:var(--surface-2,#f7f6f1);cursor:pointer}.pl-mini-avatar{width:25px;height:25px;border-radius:50%;display:grid;place-items:center;background:var(--accent-soft,#d9eeee);color:var(--accent,#138f90);font-size:11px;font-weight:800}.pl-switcher{position:fixed;right:20px;top:58px;z-index:10000;width:min(420px,calc(100vw - 40px));padding:16px;border:1px solid var(--line,rgba(0,0,0,.12));border-radius:18px;background:var(--surface,#fff);box-shadow:0 24px 70px rgba(0,0,0,.18)}.pl-switcher[hidden]{display:none}.pl-switcher-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:10px 0}.pl-switcher .pl-profile{min-height:110px;padding:10px}.pl-switcher .pl-profile-avatar{width:48px;height:48px;font-size:20px}.pl-switcher .pl-profile-sub{display:none}
      @media(max-width:700px){.pl-auth-card{padding:22px}.pl-profile-grid{grid-template-columns:repeat(2,1fr)}}
    `;
    document.head.appendChild(style);
  }

  function avatarLetter(account) {
    const s = String(account?.name || "?").trim();
    return (s[0] || "?").toUpperCase();
  }

  function createGate() {
    let gate = document.getElementById("plAccountGate");
    if (gate) return gate;
    gate = document.createElement("div");
    gate.id = "plAccountGate";
    gate.hidden = true;
    gate.innerHTML = `
      <section class="pl-auth-card" role="dialog" aria-modal="true">
        <div class="pl-auth-top"><div class="pl-auth-brand"><img src="/static/logo-mark.png" alt=""><div><div class="pl-auth-kicker">Prompt Library</div><div style="font-weight:800">Private workspaces</div></div></div></div>
        <h1 class="pl-auth-title">Who is working?</h1>
        <p class="pl-auth-copy">Each profile has its own prompts, workspaces, history, preferences and account memory.</p>
        <div id="plProfileGrid" class="pl-profile-grid"></div>
        <div class="pl-auth-actions"><button class="pl-btn primary" id="plCreateAccount">Create account</button><button class="pl-btn" id="plResetAccount">Reset password</button></div>
        <form id="plAuthForm" class="pl-auth-form" hidden>
          <div class="pl-field"><label for="plAuthName">Account name</label><input id="plAuthName" autocomplete="username" maxlength="48"></div>
          <div class="pl-field"><label for="plAuthPassword">Password</label><input id="plAuthPassword" type="password" autocomplete="current-password" minlength="12"></div>
          <div class="pl-field" id="plAuthConfirmWrap" hidden><label for="plAuthConfirm">Confirm password</label><input id="plAuthConfirm" type="password" autocomplete="new-password" minlength="12"></div>
          <div class="pl-auth-actions"><button class="pl-btn primary" type="submit" id="plAuthSubmit">Sign in</button><button class="pl-btn" type="button" id="plAuthCancel">Back</button></div>
          <div id="plAuthMessage" class="pl-message" role="alert"></div>
        </form>
        <div id="plRecoveryBox" hidden></div>
      </section>`;
    document.body.appendChild(gate);
    return gate;
  }

  async function showProfiles() {
    const gate = createGate();
    const grid = gate.querySelector("#plProfileGrid");
    const form = gate.querySelector("#plAuthForm");
    const recovery = gate.querySelector("#plRecoveryBox");
    recovery.hidden = true;
    form.hidden = true;
    grid.innerHTML = "<div style='opacity:.55;font-size:13px'>Loading profiles...</div>";
    const res = await api("/api/auth/bootstrap");
    const data = await res.json();
    const accounts = data.accounts || [];
    grid.innerHTML = accounts.map(a => `
      <button class="pl-profile" type="button" data-account-id="${esc(a.id)}">
        <span class="pl-profile-avatar">${esc(avatarLetter(a))}</span><span class="pl-profile-name">${esc(a.name)}</span><span class="pl-profile-sub">Select profile</span>
      </button>`).join("") || "<div style='opacity:.55;font-size:13px'>No accounts yet. Create the first profile.</div>";
    grid.querySelectorAll("[data-account-id]").forEach(btn => btn.addEventListener("click", () => switchAccount(btn.dataset.accountId)));
    gate.hidden = false;
  }

  async function switchAccount(id) {
    const res = await api("/api/auth/switch", {method:"POST",body:JSON.stringify({account_id:id})});
    const data = await res.json();
    if (!res.ok) {
      const gate = createGate();
      gate.querySelector("#plAuthMessage").textContent = data.error || "This profile needs a password before it can be used on this device.";
      openLogin("signin", id);
      return;
    }
    setActive(data.account);
    window.location.reload();
  }

  function openLogin(mode, accountId) {
    const gate = createGate();
    const grid = gate.querySelector("#plProfileGrid"), form = gate.querySelector("#plAuthForm");
    grid.hidden = true; form.hidden = false;
    const submit = gate.querySelector("#plAuthSubmit");
    const name = gate.querySelector("#plAuthName");
    const confirmWrap = gate.querySelector("#plAuthConfirmWrap");
    name.value = "";
    submit.textContent = mode === "signup" ? "Create account" : "Sign in";
    confirmWrap.hidden = mode !== "signup";
    gate.querySelector("#plAuthMessage").textContent = "";
    form.dataset.mode = mode;
    form.dataset.accountId = accountId || "";
  }

  function bindGate() {
    const gate = createGate();
    gate.querySelector("#plCreateAccount").onclick = () => openLogin("signup");
    gate.querySelector("#plResetAccount").onclick = () => {
      const name = prompt("Account name");
      if (!name) return;
      const code = prompt("Recovery code");
      if (!code) return;
      const password = prompt("New password, 12+ characters");
      if (!password) return;
      api("/api/auth/reset",{method:"POST",body:JSON.stringify({name,recovery_code:code,new_password:password})})
        .then(async r=>({ok:r.ok,data:await r.json()}))
        .then(x=>{
          const msg=gate.querySelector("#plAuthMessage");
          msg.textContent=x.ok?"Password reset. You are signed in.":(x.data.error||"Reset failed.");
          if(x.ok){setActive(x.data.account); showRecovery(x.data.recovery_code); window.location.reload();}
        });
    };
    gate.querySelector("#plAuthCancel").onclick = () => showProfiles();
    gate.querySelector("#plAuthForm").onsubmit = async e => {
      e.preventDefault();
      const form=e.currentTarget, mode=form.dataset.mode;
      const name=gate.querySelector("#plAuthName").value.trim();
      const password=gate.querySelector("#plAuthPassword").value;
      const confirm=gate.querySelector("#plAuthConfirm").value;
      if(mode==="signup" && password!==confirm){gate.querySelector("#plAuthMessage").textContent="Passwords do not match.";return;}
      const endpoint=mode==="signup"?"/api/auth/register":"/api/auth/login";
      const res=await api(endpoint,{method:"POST",body:JSON.stringify({name,password})});
      const data=await res.json();
      if(!res.ok){gate.querySelector("#plAuthMessage").textContent=data.error||"Authentication failed.";return;}
      setActive(data.account);
      if(data.recovery_code) showRecovery(data.recovery_code);
      window.location.reload();
    };
  }

  function showRecovery(code) {
    if(!code) return;
    const gate=createGate(), box=gate.querySelector("#plRecoveryBox");
    box.hidden=false;
    box.innerHTML=`<div class="pl-recovery">Save this recovery code somewhere safe. It is shown once and replaces the password if you forget it.<strong>${esc(code)}</strong></div>`;
  }

  async function addMenu() {
    if(document.getElementById("plAccountMenuV2")) return;
    const host=document.querySelector("#contentHeader .header-top") || document.querySelector(".header-top");
    if(!host) return;
    const me=await api("/api/auth/me").then(r=>r.json()).catch(()=>null);
    if(!me?.authenticated) return;
    setActive(me.account);
    const menu=document.createElement("div");
    menu.id="plAccountMenuV2";
    menu.innerHTML=`<button class="pl-current-profile" id="plProfileButton" type="button"><span class="pl-mini-avatar">${esc(avatarLetter(me.account))}</span><span>${esc(me.account.name)}</span></button>`;
    host.appendChild(menu);
    const pop=document.createElement("div");
    pop.className="pl-switcher";pop.id="plProfileSwitcher";pop.hidden=true;
    document.body.appendChild(pop);
    menu.querySelector("#plProfileButton").onclick=async()=>{
      pop.hidden=!pop.hidden;
      if(!pop.hidden){
        const data=await api("/api/auth/bootstrap").then(r=>r.json());
        pop.innerHTML=`<strong>Switch profile</strong><div class="pl-switcher-grid">${(data.accounts||[]).map(a=>`<button class="pl-profile" type="button" data-account-id="${esc(a.id)}"><span class="pl-profile-avatar">${esc(avatarLetter(a))}</span><span class="pl-profile-name">${esc(a.name)}</span><span class="pl-profile-sub">Quick switch</span></button>`).join("")}</div><div class="pl-auth-actions"><button class="pl-btn" id="plEditProfile">Edit profile</button><button class="pl-btn" id="plChangePassword">Change password</button><button class="pl-btn danger" id="plDeleteAccount">Delete account</button><button class="pl-btn" id="plSignOut">Sign out</button></div>`;
        pop.querySelectorAll("[data-account-id]").forEach(b=>b.onclick=()=>switchAccount(b.dataset.accountId));
        pop.querySelector("#plSignOut").onclick=async()=>{await api("/api/auth/logout",{method:"POST"});setActive(null);window.location.reload();};
        pop.querySelector("#plEditProfile").onclick=async()=>{const name=prompt("Account name",me.account.name);if(!name)return;const avatar=prompt("Profile icon name",me.account.avatar||"person")||"person";await api("/api/auth/profile",{method:"PUT",body:JSON.stringify({name,avatar})});window.location.reload();};
        pop.querySelector("#plChangePassword").onclick=async()=>{const current=prompt("Current password");if(!current)return;const next=prompt("New password, 12+ characters");if(!next)return;const r=await api("/api/auth/password",{method:"PUT",body:JSON.stringify({current_password:current,new_password:next})});const d=await r.json();alert(r.ok?"Password changed.":(d.error||"Password change failed."));};
        pop.querySelector("#plDeleteAccount").onclick=async()=>{if(!confirm("Delete this account and its private library permanently?"))return;const current=prompt("Enter current password");if(!current)return;const r=await api("/api/auth/delete",{method:"DELETE",body:JSON.stringify({current_password:current})});if(r.ok)window.location.reload();else alert((await r.json()).error||"Delete failed.");};
      }
    };
  }

  function lockUntilAuth() {
    const gate=createGate();
    gate.hidden=true;
    api("/api/auth/me").then(async r=>{
      if(!r.ok){gate.hidden=false;return;}
      const data=await r.json();
      if(!data.authenticated){gate.hidden=false;showProfiles();return;}
      setActive(data.account);
      booted=true;
      await addMenu();
    }).catch(()=>{gate.hidden=false;});
  }

  function loadNodeCanvas() {
    if (!document.getElementById("plnCanvasCss")) {
      const link = document.createElement("link");
      link.id = "plnCanvasCss";
      link.rel = "stylesheet";
      link.href = "/static/prompt-components-node.css?v=node1";
      document.head.appendChild(link);
    }
    if (!document.getElementById("plnCanvasScript")) {
      const script = document.createElement("script");
      script.id = "plnCanvasScript";
      script.src = "/static/prompt-components-node.js?v=node1";
      script.defer = true;
      document.head.appendChild(script);
    }
  }

  patchStorage();
  injectStyles();
  loadNodeCanvas();
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",()=>{bindGate();lockUntilAuth();});
  else {bindGate();lockUntilAuth();}

  window.PL_Accounts={
    current:()=>activeId,
    signOut:async()=>{await api("/api/auth/logout",{method:"POST"});setActive(null);window.location.reload();},
    openPicker:showProfiles
  };
})();