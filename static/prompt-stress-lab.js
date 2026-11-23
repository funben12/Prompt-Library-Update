(function(){
  "use strict";
  const ROOT = "promptStressLabWorkspace";
  const KEY = "promptlib.stresslab.patterns.v1";
  const MODES = {
    quick: { label:"QUICK", desc:"Fast structural scan", lenses:["clarity","ambiguity","inputs","output"] },
    harden: { label:"HARDEN", desc:"Full prompt QA", lenses:["clarity","oneShot","handoff","ambiguity","inputs","output","constraints","future"] },
    critical: { label:"CRITICAL", desc:"Adversarial pressure", lenses:["clarity","oneShot","handoff","ambiguity","inputs","output","constraints","future","redTeam"] }
  };
  const $ = id => document.getElementById(id);
  let mode = "harden", findings = [], lastPrompt = "", opener = null, promptCache = null;
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  function toast(message){ if(window.PL_toast) window.PL_toast(message); else console.info("[Prompt Stress Lab]",message); }
  function loadPatterns(){ try { const v=JSON.parse(localStorage.getItem(KEY)||"{}"); return v && typeof v==="object" ? v : {}; } catch(e){ return {}; } }
  function savePatterns(value){ try { localStorage.setItem(KEY,JSON.stringify(value)); return true; } catch(e){ toast("Pattern memory could not be saved on this device."); return false; } }
  function addPatternMemory(items){
    const map=loadPatterns(), now=Date.now();
    items.forEach(x=>{ if(!map[x.id]) map[x.id]={count:0,lastSeen:0,label:x.title}; map[x.id].count++; map[x.id].lastSeen=now; map[x.id].label=x.title; });
    savePatterns(map);
  }
  function patternContext(){
    const map=loadPatterns();
    return Object.entries(map).sort((a,b)=>b[1].count-a[1].count).slice(0,5).map(([id,v])=>({id,label:v.label,count:v.count}));
  }
  function addStyles(){
    if($("pslStyles")) return;
    const link=document.createElement("link"); link.id="pslStyles"; link.rel="stylesheet"; link.href="/static/prompt-stress-lab.css?v=20261118a"; document.head.appendChild(link);
  }
  function shell(){
    if($(ROOT)) return;
    const el=document.createElement("section");
    el.id=ROOT; el.setAttribute("role","dialog"); el.setAttribute("aria-modal","true"); el.setAttribute("aria-label","Prompt Stress Lab"); el.tabIndex=-1;
    el.innerHTML=`
      <header class="psl-head">
        <div class="psl-brand"><span class="psl-mark material-symbols-outlined">fact_check</span><div><p class="psl-kicker">Prompt quality assurance</p><h2 class="psl-title">Prompt Stress Lab</h2><p class="psl-subtitle">Find weaknesses before a prompt reaches production.</p></div></div>
        <div class="psl-head-actions"><button class="psl-btn" type="button" data-psl-close>Close <span class="material-symbols-outlined">close</span></button></div>
      </header>
      <div class="psl-body">
        <section class="psl-panel">
          <div class="psl-panel-head"><div><h3 class="psl-panel-title">Target prompt</h3><span class="psl-muted">Paste a prompt or load one from your library.</span></div><span class="psl-tag">LOCAL FIRST</span></div>
          <div><label class="psl-label" for="pslPicker">Saved prompt</label><select id="pslPicker" class="psl-select"><option value="">Choose a saved prompt...</option></select></div>
          <div><label class="psl-label" for="pslInput">Prompt to test</label><textarea id="pslInput" class="psl-textarea" placeholder="Paste your existing prompt here..."></textarea></div>
          <div><span class="psl-label">Testing intensity</span><div class="psl-modes" role="group" aria-label="Testing intensity">
            <button class="psl-mode" type="button" data-mode="quick" aria-pressed="false">QUICK<small>Fast scan</small></button>
            <button class="psl-mode" type="button" data-mode="harden" aria-pressed="true">HARDEN<small>Full QA</small></button>
            <button class="psl-mode" type="button" data-mode="critical" aria-pressed="false">CRITICAL<small>Adversarial</small></button>
          </div></div>
          <label class="psl-check-row"><input id="pslUseContext" type="checkbox"><span>Include up to two relevant Context Bank blocks in optional AI analysis. This adds their text to the AI request.</span></label>
          <div class="psl-actions">
            <button class="psl-btn psl-btn-primary" id="pslRunLocal" type="button"><span class="material-symbols-outlined">science</span> Run local checks</button>
            <button class="psl-btn" id="pslRunAI" type="button"><span class="material-symbols-outlined">auto_awesome</span> Optional AI review</button>
          </div>
          <p class="psl-muted">Local checks use no AI and consume no API tokens. AI review is a separate, user initiated request.</p>
        </section>
        <section class="psl-panel">
          <div class="psl-panel-head"><div><h3 class="psl-panel-title">Failure map</h3><span class="psl-muted" id="pslStatus">Waiting for a prompt.</span></div><span class="psl-tag" id="pslVerdict">NOT TESTED</span></div>
          <div id="pslResults" class="psl-results"><div class="psl-empty">Your analysis will appear here.<br>Start with a local scan. No AI request will be made.</div></div>
          <div class="psl-section"><h3>Recurring patterns on this device</h3><div id="pslPatterns" class="psl-patterns"><span class="psl-muted">No pattern history yet.</span></div></div>
          <div class="psl-actions"><button class="psl-btn" id="pslCopy" type="button">Copy report</button><button class="psl-btn" id="pslSave" type="button">Save report to Library</button><button class="psl-btn" id="pslExport" type="button">Export pattern history</button></div>
        </section>
      </div>
      <footer class="psl-foot">Structural analysis is heuristic, not proof of runtime reliability. A prompt is not marked production ready until it has been tested against real inputs and outputs. AI review sends the prompt to your configured provider only after you choose it.</footer>`;
    document.body.appendChild(el);
    el.addEventListener("click",onClick);
    el.addEventListener("change",onChange);
    $("pslInput").addEventListener("input",()=>{ if($("pslStatus")) $("pslStatus").textContent="Prompt changed. Run the checks again."; });
    renderPatterns();
  }
  function ensureCard(){
    const group=document.querySelector('#launcherGrid .launcher-group[data-group="inspect"]');
    if(!group || group.querySelector('[data-open="openPromptStressLabWorkspace"]')) return;
    const card=document.createElement("button");
    card.type="button"; card.className="launcher-card"; card.dataset.open="openPromptStressLabWorkspace"; card.dataset.premium="true";
    card.innerHTML='<span class="material-symbols-outlined launcher-card-icon">fact_check</span><span class="launcher-card-text"><span class="launcher-card-title">Prompt Stress Lab</span><span class="launcher-card-desc">Stress test prompts, map failure modes and review patches before shipping</span></span><span class="launcher-card-pro">PRO</span>';
    group.appendChild(card);
    if(window.PLWS && typeof window.PLWS.refresh==="function") window.PLWS.refresh();
  }
  async function loadPrompts(){
    if(promptCache) return promptCache;
    try{ const r=await fetch("/api/prompts",{credentials:"same-origin"}); if(!r.ok) throw new Error("Library unavailable"); const d=await r.json(); promptCache=Array.isArray(d)?d:(d.prompts||[]); }
    catch(e){ promptCache=[]; }
    return promptCache;
  }
  async function fillPicker(){
    const select=$("pslPicker"); if(!select) return;
    select.replaceChildren(new Option("Choose a saved prompt...",""));
    const prompts=await loadPrompts();
    prompts.slice(0,300).forEach(p=>{ const o=document.createElement("option"); o.value=p.id; o.textContent=p.title||"Untitled prompt"; select.appendChild(o); });
  }
  function onChange(e){
    if(e.target.id==="pslPicker"){
      const p=(promptCache||[]).find(x=>String(x.id)===String(e.target.value));
      if(p) $("pslInput").value=p.content||"";
    }
  }
  function onClick(e){
    const close=e.target.closest("[data-psl-close]"); if(close){closeLab();return;}
    const m=e.target.closest("[data-mode]"); if(m){mode=m.dataset.mode; document.querySelectorAll("#promptStressLabWorkspace [data-mode]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.mode===mode?"true":"false")); $("pslStatus").textContent=MODES[mode].desc; return;}
    if(e.target.closest("#pslRunLocal")){runLocal();return;}
    if(e.target.closest("#pslRunAI")){runAI();return;}
    if(e.target.closest("#pslCopy")){copyReport();return;}
    if(e.target.closest("#pslSave")){saveReport();return;}
    if(e.target.closest("#pslExport")){exportPatterns();return;}
  }
  function check(id,title,tests){
    const text=lastPrompt, matched=tests.filter(t=>t.re.test(text));
    return matched.map(t=>({id,title,severity:t.severity||"medium",evidence:t.evidence||"A structural signal was detected.",recommendation:t.fix||"Review this area and make the expected behaviour explicit."}));
  }
  function analyze(text){
    lastPrompt=text;
    const words=text.trim().split(/\s+/).filter(Boolean), sentences=text.split(/[.!?]+/).filter(x=>x.trim()).length;
    const hasOutput=/\b(output|format|return|respond|structure|deliverable|schema|table|bullet|json|markdown)\b/i.test(text);
    const hasInput=/\b(input|context|source material|data|audience|user provides)\b/i.test(text);
    const checks={
      clarity:()=>check("clarity","Clarity",[
        {re:/\b(do the needful|handle appropriately|use your judgement|as appropriate)\b/i,severity:"medium",evidence:"The prompt contains broad instructions without an observable success condition.",fix:"Replace broad wording with a specific action and an observable completion condition."},
        {re:/\b(appropriate|suitable|good|high quality|detailed)\b/i,severity:"low",evidence:"Subjective quality language may be interpreted differently.",fix:"Define what an acceptable result must contain or demonstrate."}
      ]),
      oneShot:()=>check("oneShot","One shot execution",[
        {re:/\b(ask me|ask the user|wait for my|we will decide later)\b/i,severity:"medium",evidence:"The prompt may depend on a follow up interaction.",fix:"Define what to do when required information is missing, including whether to ask or use a stated default."},
        {re:/\b(above|previous message|as discussed|earlier context)\b/i,severity:"medium",evidence:"Execution may depend on conversation context that is not included with the prompt.",fix:"Include required context directly or define a standalone input contract."}
      ]),
      handoff:()=>check("handoff","Handoff",[
        {re:/\b(my usual|our process|as we agreed|you already know|previous conversation)\b/i,severity:"high",evidence:"The prompt assumes knowledge that may not travel with it.",fix:"Replace private references with explicit instructions, definitions and supplied context."}
      ]),
      ambiguity:()=>check("ambiguity","Ambiguity",[
        {re:/\b(maybe|possibly|as needed|if appropriate|where relevant|etc\.)\b/i,severity:"low",evidence:"Flexible wording may leave important decisions undefined.",fix:"State who decides, what criteria apply and what to do when the condition is unclear."},
        {re:/\b(always|never)\b/i,severity:"low",evidence:"Absolute rules may conflict with edge cases or higher priority requirements.",fix:"Define the scope and exceptions for absolute rules."}
      ]),
      inputs:()=>check("inputs","Inputs and assumptions",[
        {re:/\b(assume|presume|you know|the data|the document|the file)\b/i,severity:"medium",evidence:"The prompt refers to information that may not be supplied.",fix:"List required inputs and define a missing input response. Do not invent unavailable information."},
        ...(!hasInput?[{re:/^/,severity:"low",evidence:"No clear input contract was detected.",fix:"Specify what the user must provide and which fields are optional."}]:[])
      ]),
      output:()=>check("output","Output contract",[
        ...(!hasOutput?[{re:/^/,severity:"medium",evidence:"No explicit output structure or delivery format was detected.",fix:"Specify the sections, format, level of detail and completion criteria."}]:[]),
        {re:/\b(be comprehensive|be concise|keep it detailed)\b/i,severity:"low",evidence:"The requested level of detail is subjective.",fix:"Set a length range or define the information that must be included."}
      ]),
      constraints:()=>check("constraints","Constraint integrity",[
        {re:/\b(short|brief|concise)\b/i,severity:"low",evidence:"A brevity preference is present. Check that it does not conflict with completeness requirements.",fix:"Prioritise requirements and state which sections may be shortened."},
        {re:/\b(do not|never)\b/i,severity:"low",evidence:"Negative constraints are present. Confirm each has a clear scope and a testable boundary.",fix:"Group hard constraints separately from preferences and define how conflicts are resolved."}
      ]),
      future:()=>check("future","Future failure",[
        {re:/\b(error|failure|fallback|edge case|missing|invalid|empty input|uncertain)\b/i,severity:"low",evidence:"Some failure handling language exists. Check that it defines an actual recovery action.",fix:"Define behaviour for missing, invalid, contradictory and unexpectedly large inputs."},
        ...(!/\b(error|failure|fallback|edge case|missing|invalid|uncertain)\b/i.test(text)?[{re:/^/,severity:"medium",evidence:"No explicit failure or recovery behaviour was detected.",fix:"Add fallback behaviour for missing information, invalid inputs and conflicting requirements."}]:[])
      ]),
      redTeam:()=>check("redTeam","Adversarial pressure",[
        {re:/\b(ignore (all |any )?(previous|prior) instructions|override|bypass|disregard)\b/i,severity:"high",evidence:"Instruction override language appears in the prompt. Confirm its authority and scope.",fix:"Define instruction priority and treat untrusted supplied content as data, not authority."},
        {re:/\b(untrusted|injection|malicious|hostile|adversarial)\b/i,severity:"low",evidence:"Adversarial handling is mentioned. Check that concrete attack cases and expected responses are defined.",fix:"Add explicit tests for instruction injection, conflicting inputs and data exfiltration attempts."},
        ...(!/\b(untrusted|injection|malicious|hostile|adversarial|ignore (all |any )?(previous|prior) instructions)\b/i.test(text)?[{re:/^/,severity:"medium",evidence:"No explicit adversarial input handling was detected.",fix:"Define how the prompt should handle hostile instructions embedded in supplied material."}]:[])
      ])
    };
    const lens=MODES[mode].lenses, results=lens.flatMap(k=>checks[k]());
    if(text.length>9000) results.push({id:"length",title:"Prompt size",severity:"low",evidence:"The prompt is long enough to justify checking for duplicated instructions and unnecessary context.",recommendation:"Remove repetition and keep only context that changes execution."});
    if(sentences>35) results.push({id:"flow",title:"Instruction flow",severity:"medium",evidence:"The prompt contains many sentence units, which may make instruction priority harder to follow.",recommendation:"Group instructions into ordered phases and separate constraints from process."});
    const unique=[]; const seen=new Set(); results.forEach(x=>{const k=x.id+"|"+x.evidence;if(!seen.has(k)){seen.add(k);unique.push(x);}});
    return {results:unique,stats:{characters:text.length,words:words.length,sentences},lenses:lens};
  }
  function runLocal(){
    const text=$("pslInput").value.trim(); if(!text){toast("Paste or load a prompt first.");return;}
    lastPrompt=text;
    const result=analyze(text); findings=result.results;
    addPatternMemory(findings);
    renderResults(result);
    renderPatterns();
  }
  function renderResults(result,aiText){
    const high=findings.filter(x=>x.severity==="high").length, medium=findings.filter(x=>x.severity==="medium").length;
    const verdict=high?"NOT READY":medium?"REVIEW REQUIRED":"STRUCTURAL SCAN ONLY";
    $("pslVerdict").textContent=verdict;
    $("pslStatus").textContent=MODES[mode].label+" scan completed. "+findings.length+" findings.";
    const wrap=$("pslResults"); wrap.replaceChildren();
    const stats=document.createElement("div"); stats.className="psl-summary";
    [[""+result.stats.words,"Words"],[""+findings.length,"Findings"],[""+result.stats.characters,"Characters"]].forEach(([n,l])=>{const d=document.createElement("div");d.className="psl-stat";const b=document.createElement("strong");b.textContent=n;const s=document.createElement("span");s.textContent=l;d.append(b,s);stats.appendChild(d);});
    wrap.appendChild(stats);
    const section=document.createElement("div"); section.className="psl-section";
    const h=document.createElement("h3");h.textContent="Failure map";section.appendChild(h);
    if(!findings.length){const p=document.createElement("p");p.className="psl-muted";p.textContent="No obvious structural signals were flagged. This is not a pass or a runtime guarantee.";section.appendChild(p);}
    findings.forEach(f=>{const row=document.createElement("div");row.className="psl-finding";const title=document.createElement("strong");title.textContent=f.title;const tag=document.createElement("span");tag.className="psl-tag "+f.severity;tag.textContent=f.severity.toUpperCase();const detail=document.createElement("p");detail.textContent=f.evidence+"\nRecommended patch: "+f.recommendation;row.append(title,tag,detail);section.appendChild(row);});
    wrap.appendChild(section);
    if(aiText){const ai=document.createElement("div");ai.className="psl-section";const ah=document.createElement("h3");ah.textContent="AI review";const pre=document.createElement("pre");pre.className="psl-report";pre.textContent=aiText;ai.append(ah,pre);wrap.appendChild(ai);}
  }
  function renderPatterns(){
    const root=$("pslPatterns"); if(!root)return; root.replaceChildren();
    const items=patternContext();
    if(!items.length){const s=document.createElement("span");s.className="psl-muted";s.textContent="No recurring patterns recorded yet.";root.appendChild(s);return;}
    items.forEach(x=>{const s=document.createElement("span");s.className="psl-pattern";s.textContent=x.label+" · "+x.count+" scans";root.appendChild(s);});
  }
  function reportText(){
    if(!lastPrompt)return "No report available.";
    const lines=["PROMPT STRESS LAB REPORT","Mode: "+MODES[mode].label,"Prompt length: "+lastPrompt.length+" characters","","FAILURE MAP"];
    findings.forEach(x=>lines.push("["+x.severity.toUpperCase()+"] "+x.title+"\n"+x.evidence+"\nPatch: "+x.recommendation));
    lines.push("","KEEP / REMOVE / SHIP DECISION","Keep the original prompt unchanged until each proposed patch has been reviewed.","Remove only duplicated or conflicting instructions after confirming their purpose.","SHIP STATUS: "+(findings.some(x=>x.severity==="high")?"NOT READY":"REQUIRES REAL EXECUTION TESTS"));
    return lines.join("\n");
  }
  async function runAI(){
    if(!lastPrompt || $("pslInput").value.trim()!==lastPrompt) runLocal();
    if(!lastPrompt)return;
    const fn=window.PLBridge&&window.PLBridge.callAI||window.callAI;
    if(typeof fn!=="function"){toast("AI is not configured. Local checks remain available.");return;}
    const btn=$("pslRunAI");btn.disabled=true;btn.textContent="AI review running...";
    let context="";
    if($("pslUseContext").checked){
      try{
        const blocks=JSON.parse(localStorage.getItem("pl_ctx_blocks")||"[]");
        const terms=new Set(lastPrompt.toLowerCase().match(/[a-z0-9]{4,}/g)||[]);
        const ranked=(Array.isArray(blocks)?blocks:[]).map(b=>{const t=String((b.title||"")+" "+(b.content||""));const score=(t.toLowerCase().match(/[a-z0-9]{4,}/g)||[]).filter(w=>terms.has(w)).length;return {b,score};}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,2);
        context=ranked.map(x=>"Context block: "+x.b.title+"\n"+String(x.b.content||"").slice(0,1400)).join("\n\n").slice(0,2800);
      }catch(e){context="";}
    }
    const system="You are a rigorous prompt quality assurance analyst. Review the supplied prompt through the selected failure lenses. Do not rewrite the prompt automatically. Return concise sections exactly: FAILURE MAP, PATCHES, KEEP / REMOVE, SHIP / NOT READY. For every finding include evidence from the prompt, severity, likely consequence and a minimal patch. Distinguish observed evidence from inference. Never claim execution was tested.";
    const user="MODE: "+mode.toUpperCase()+"\nLENSES: "+MODES[mode].lenses.join(", ")+"\n\nPROMPT:\n"+lastPrompt.slice(0,20000)+"\n\nLOCAL FINDINGS:\n"+reportText()+"\n\nOPTIONAL CONTEXT BANK MATERIAL:\n"+(context||"Not supplied.");
    try{
      const answer=await fn.call(window.PLBridge||window,system,user,mode==="critical"?2200:1600);
      if(answer){const result=analyze(lastPrompt);renderResults(result,String(answer));}else toast("AI review returned no result.");
    }catch(err){toast("AI review failed: "+((err&&err.message)||"unknown error")+". Your local report is still available.");}
    finally{btn.disabled=false;btn.innerHTML='<span class="material-symbols-outlined">auto_awesome</span> Optional AI review';}
  }
  async function copyReport(){
    const text=reportText();
    try{await navigator.clipboard.writeText(text);toast("Report copied.");}catch(e){toast("Clipboard access unavailable.");}
  }
  async function saveReport(){
    const text=reportText(); if(!lastPrompt){toast("Run a scan first.");return;}
    try{
      const r=await fetch("/api/prompts",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:"Stress Lab Report, "+new Date().toLocaleDateString("en-GB"),content:text,description:"Local prompt QA report. Original prompt is not modified.",categories:"Prompt QA",tags:"stress-lab"})});
      if(!r.ok)throw new Error("Save failed");toast("Report saved to Library.");
    }catch(e){toast("Could not save the report.");}
  }
  function exportPatterns(){
    const data={type:"prompt-library-stress-patterns",version:1,patterns:loadPatterns()};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    if(typeof window.PL_saveBlob==="function"){window.PL_saveBlob(blob,"prompt-stress-patterns.json","Pattern history exported");return;}
    const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="prompt-stress-patterns.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
  }
  function openLab(){
    if(!document.body.classList.contains("is-premium")){toast("Activate Prompt Library Pro to open this workspace.");return;}
    addStyles(); shell(); opener=document.activeElement;
    if(window.PLNewWorkspaceSuite) window.PLNewWorkspaceSuite.close();
    $(ROOT).classList.add("open");document.body.classList.add("plx-workspace-open");
    if(window.PLWS&&window.PLWS.noteOpened)window.PLWS.noteOpened("openPromptStressLabWorkspace");
    fillPicker();$("pslInput").focus();
  }
  function closeLab(){
    const root=$(ROOT);if(!root)return;root.classList.remove("open");document.body.classList.remove("plx-workspace-open");
    if(opener&&opener.focus)opener.focus({preventScroll:true});
  }
  function init(){
    ensureCard();
    document.addEventListener("keydown",e=>{if(e.key==="Escape"&&$(ROOT)&&$(ROOT).classList.contains("open"))closeLab();});
  }
  function analyzeFor(prompt, selectedMode){
    const previousMode=mode;
    mode=MODES[selectedMode]?selectedMode:"harden";
    const result=analyze(String(prompt||""));
    mode=previousMode;
    return result;
  }
  window.PLStressLabCore={analyze:analyzeFor,modes:MODES,recordPatterns:addPatternMemory,patterns:patternContext};
  if(!window.PL_PROMPT_TESTING_UNIFIED){
    window.openPromptStressLabWorkspace=openLab;
    if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
  }
})();