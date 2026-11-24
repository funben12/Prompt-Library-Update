(function(){
  "use strict";
  const ROOT_ID="promptTestingWorkspace";
  const $=id=>document.getElementById(id);
  let promptCache=null, lastPrompt="", lastReport="", lastRoute=[], opener=null;
  let activeRun=0;
  function toast(message){if(typeof window.PL_toast==="function")window.PL_toast(message);else console.info("[Prompt Testing Workspace]",message);}
  function addStyles(){if($("promptTestingWorkspaceStyles"))return;const link=document.createElement("link");link.id="promptTestingWorkspaceStyles";link.rel="stylesheet";link.href="/static/prompt-testing-workspace.css?v=20261119a";document.head.appendChild(link);}
  function shell(){
    if($(ROOT_ID))return;
    const root=document.createElement("section");
    root.id=ROOT_ID;root.className="ptw-root";root.setAttribute("role","dialog");root.setAttribute("aria-modal","true");root.setAttribute("aria-labelledby","ptwTitle");root.tabIndex=-1;
    root.innerHTML=`
      <header class="ptw-header"><div class="ptw-heading"><span class="ptw-kicker">Prompt quality and reliability</span><h2 id="ptwTitle">Prompt Testing Workspace</h2><p>One prompt, one shared assessment, three specialist lenses.</p></div><button class="ptw-icon-btn" type="button" data-ptw-close aria-label="Close workspace">×</button></header>
      <div class="ptw-layout">
        <section class="ptw-input-panel">
          <div class="ptw-section-heading"><div><h3>1. Set the context</h3><p>Load a saved prompt or paste the version you want to test.</p></div><span class="ptw-state">LOCAL FIRST</span></div>
          <label class="ptw-label" for="ptwPicker">Saved prompt</label><select id="ptwPicker" class="ptw-select"><option value="">Choose a saved prompt...</option></select>
          <label class="ptw-label" for="ptwPrompt">Target prompt</label><textarea id="ptwPrompt" class="ptw-prompt" spellcheck="false" placeholder="Paste your prompt here. The original will remain unchanged."></textarea>
          <label class="ptw-label" for="ptwObjective">What are you trying to achieve?</label><textarea id="ptwObjective" class="ptw-objective" rows="3" placeholder="Optional. For example, make this prompt more reliable, expose security weaknesses, or check whether it is ready to use."></textarea>
          <div class="ptw-section-heading ptw-route-heading"><div><h3>2. Choose the assessment</h3><p>Automatic routing selects only the specialists relevant to your objective.</p></div></div>
          <label class="ptw-label" for="ptwRoute">Assessment route</label>
          <select id="ptwRoute" class="ptw-select"><option value="auto">Automatic recommendation</option><option value="surgeon">Prompt Surgeon, improve and repair</option><option value="redteam">Prompt Red Team, find failure modes</option><option value="stress">Stress Lab, assess prompt quality</option><option value="full">Full assessment, all three specialists</option></select>
          <div id="ptwRouteSummary" class="ptw-route-summary" aria-live="polite">Automatic route will be recommended from your objective.</div>
          <label class="ptw-label" for="ptwStressMode">Stress Lab depth</label>
          <select id="ptwStressMode" class="ptw-select"><option value="quick">QUICK, fast structural scan</option><option value="harden" selected>HARDEN, full prompt QA</option><option value="critical">CRITICAL, adversarial pressure</option></select>
          <label class="ptw-context-option"><input id="ptwUseContext" type="checkbox"><span>Include up to two relevant Context Bank blocks in the optional AI review. Off by default.</span></label>
          <div class="ptw-actions"><button class="ptw-btn ptw-primary" id="ptwLocal" type="button">Run local assessment</button><button class="ptw-btn" id="ptwAI" type="button">Run combined AI review</button></div>
          <p class="ptw-note">Local assessment makes no AI calls. Combined AI review is optional and sends one request for the selected specialists. Nothing rewrites your saved prompt automatically.</p>
        </section>
        <section class="ptw-results-panel">
          <div class="ptw-results-top"><div><span class="ptw-kicker">Shared assessment record</span><h3>3. Findings and recommendations</h3><p id="ptwStatus">Waiting for a prompt.</p></div><span id="ptwVerdict" class="ptw-verdict">NOT TESTED</span></div>
          <div id="ptwResults" class="ptw-results"><div class="ptw-empty">Your results will appear here.<br>Start with a local assessment to get a zero-token baseline.</div></div>
          <div id="ptwPatternSummary" class="ptw-pattern-summary">No recurring QA patterns recorded on this device yet.</div>
          <div class="ptw-report-actions"><button class="ptw-btn" id="ptwCopy" type="button">Copy combined report</button><button class="ptw-btn" id="ptwSave" type="button">Save report to Library</button><button class="ptw-btn" id="ptwExportPatterns" type="button">Export QA patterns</button></div>
        </section>
      </div>
      <footer class="ptw-footer">Surgeon, Red Team and Stress Lab share the same prompt and assessment context. A structural scan is evidence for review, not proof of runtime reliability. Gauntlet Loop remains a separate tool.</footer>`;
    document.body.appendChild(root);root.addEventListener("click",onClick);root.addEventListener("change",onChange);
    $("ptwPrompt").addEventListener("input",()=>markDirty("Prompt changed. Run the assessment again."));
    $("ptwObjective").addEventListener("input",updateRouteSummary);$("ptwRoute").addEventListener("change",updateRouteSummary);
  }
  async function loadPrompts(){if(promptCache)return promptCache;try{const response=await fetch("/api/prompts",{credentials:"same-origin"});if(!response.ok)throw new Error("Library unavailable");const data=await response.json();promptCache=Array.isArray(data)?data:(data.prompts||[]);}catch(_){promptCache=[];}return promptCache;}
  async function fillPicker(){const select=$("ptwPicker");if(!select)return;const prompts=await loadPrompts();select.replaceChildren(new Option("Choose a saved prompt...",""));prompts.slice(0,300).forEach(prompt=>{const option=document.createElement("option");option.value=prompt.id;option.textContent=prompt.title||"Untitled prompt";select.appendChild(option);});}
  function onChange(event){if(event.target.id!=="ptwPicker")return;const prompt=(promptCache||[]).find(item=>String(item.id)===String(event.target.value));if(prompt){$("ptwPrompt").value=prompt.content||"";markDirty("Saved prompt loaded. Run the assessment when ready.");}}
  function routeFor(prompt,objective){
    const text=(String(objective||"")+" "+String(prompt||"")).toLowerCase(),selected=$("ptwRoute")?$("ptwRoute").value:"auto";
    if(selected==="surgeon")return["surgeon"];if(selected==="redteam")return["redteam"];if(selected==="stress")return["stress"];if(selected==="full")return["surgeon","redteam","stress"];
    if(/\b(repair|rewrite|improve|strengthen|optimise|optimize|refine|fix|restructure)\b/.test(text))return["surgeon","stress"];
    if(/\b(attack|adversarial|security|injection|hostile|bypass|abuse|exploit|red team)\b/.test(text))return["redteam","stress"];
    if(/\b(ready|reliable|quality|robust|test|evaluate|assess|audit|production)\b/.test(text))return["stress","redteam"];
    return["stress"];
  }
  function routeNames(route){return route.map(key=>({surgeon:"Prompt Surgeon",redteam:"Prompt Red Team",stress:"Prompt Stress Lab"}[key]));}
  function updateRouteSummary(){const route=routeFor($("ptwPrompt")?.value||"",$("ptwObjective")?.value||"");$("ptwRouteSummary").textContent="Recommended: "+routeNames(route).join(" + ")+". "+(route.length===3?"All specialist lenses are selected.":"Only the relevant specialist checks will run.");}
  function markDirty(message){lastReport="";$("ptwStatus").textContent=message;$("ptwVerdict").textContent="NOT TESTED";updateRouteSummary();}
  function formatStress(result,stressMode){const lines=["PROMPT STRESS LAB","Mode: "+String(stressMode||"harden").toUpperCase(),"Words: "+result.stats.words,"Characters: "+result.stats.characters,"Sentences: "+result.stats.sentences,"","FINDINGS"];if(!result.results.length)lines.push("No obvious structural signals were flagged. This is not a pass or a runtime guarantee.");result.results.forEach(item=>lines.push("["+item.severity.toUpperCase()+"] "+item.title+"\nEvidence: "+item.evidence+"\nRecommendation: "+item.recommendation));return lines.join("\n");}
  function localAssessment(prompt,route,stressMode){
    const specialists=window.PLPromptTestingSpecialists||{},stress=window.PLStressLabCore,output=[];
    if(route.includes("surgeon")){const result=typeof specialists.localSurgeon==="function"?specialists.localSurgeon(prompt):"Prompt Surgeon analysis is unavailable.";output.push({key:"surgeon",title:"Prompt Surgeon",body:result});}
    if(route.includes("redteam")){const result=typeof specialists.localRedTeam==="function"?specialists.localRedTeam(prompt):"Prompt Red Team analysis is unavailable.";output.push({key:"redteam",title:"Prompt Red Team",body:result});}
    if(route.includes("stress")){const result=stress&&typeof stress.analyze==="function"?stress.analyze(prompt,stressMode||"harden"):null;if(result&&stress&&typeof stress.recordPatterns==="function")stress.recordPatterns(result.results);output.push({key:"stress",title:"Prompt Stress Lab",body:result?formatStress(result,stressMode):"Stress Lab analysis is unavailable.",findings:result?result.results:[]});}
    return output;
  }
  function buildReport(prompt,objective,route,sections,aiText){const lines=["PROMPT TESTING WORKSPACE, COMBINED REPORT","Assessment date: "+new Date().toLocaleString("en-GB"),"Prompt length: "+prompt.length+" characters","Objective: "+(objective.trim()||"Not supplied"),"Specialists: "+routeNames(route).join(", "),"","SPECIALIST FINDINGS"];sections.forEach(section=>lines.push("\n## "+section.title+"\n"+section.body));if(aiText)lines.push("\n## COMBINED AI REVIEW\n"+aiText);lines.push("\n## DECISION","Review the evidence and apply only patches that preserve the prompt's intended behaviour. The original prompt has not been modified.","Runtime readiness remains unverified until the revised prompt is tested against representative real inputs and outputs.");return lines.join("\n");}
  function renderResults(sections,report,aiText){
    const root=$("ptwResults");root.replaceChildren();
    if(!sections.length){root.innerHTML='<div class="ptw-empty">No specialist was selected. Choose an assessment route and run again.</div>';return;}
    sections.forEach(section=>{const card=document.createElement("article");card.className="ptw-result-card";const heading=document.createElement("div");heading.className="ptw-result-heading";const title=document.createElement("h4");title.textContent=section.title;const tag=document.createElement("span");tag.className="ptw-result-tag";tag.textContent="COMPLETE";heading.append(title,tag);const pre=document.createElement("pre");pre.textContent=section.body;card.append(heading,pre);root.appendChild(card);});
    if(aiText){const card=document.createElement("article");card.className="ptw-result-card ptw-ai-card";const heading=document.createElement("div");heading.className="ptw-result-heading";const title=document.createElement("h4");title.textContent="Combined AI review";const tag=document.createElement("span");tag.className="ptw-result-tag";tag.textContent="ONE REQUEST";heading.append(title,tag);const pre=document.createElement("pre");pre.textContent=aiText;card.append(heading,pre);root.appendChild(card);}
    const summary=document.createElement("p");summary.className="ptw-summary-line";summary.textContent="Shared report ready. "+sections.length+" specialist "+(sections.length===1?"lens":"lenses")+" completed.";root.appendChild(summary);lastReport=report;
  }
  function localRun(){
    const prompt=$("ptwPrompt").value.trim();if(!prompt){toast("Paste or load a prompt first.");return;}
    const route=routeFor(prompt,$("ptwObjective").value);lastPrompt=prompt;lastRoute=route;
    const stressMode=$("ptwStressMode").value||"harden";const sections=localAssessment(prompt,route,stressMode),report=buildReport(prompt,$("ptwObjective").value,route,sections,"");
    renderResults(sections,report,"");renderPatterns();$("ptwStatus").textContent="Local assessment complete. "+routeNames(route).join(", ")+".";
    $("ptwVerdict").textContent="REVIEW FINDINGS";return{prompt,route,sections,report,stressMode};
  }
  async function aiRun(){
    const baseline=localRun();if(!baseline)return;
    const specialists=window.PLPromptTestingSpecialists||{};if(typeof specialists.callAI!=="function"){toast("AI is not configured. Your local assessment is still available.");return;}
    const button=$("ptwAI"),runId=++activeRun;button.disabled=true;button.textContent="Combined review running...";$("ptwStatus").textContent="One combined AI request is reviewing the selected specialists.";
    const system="You are the coordinating analyst for a unified prompt quality review. The same target prompt is being assessed by selected specialist lenses. Preserve their distinctions and produce one coherent report. Do not claim execution testing. Distinguish direct evidence from inference. Prioritise issues by likely impact. Do not rewrite the prompt wholesale. Return these sections: EXECUTIVE VERDICT, CROSS SPECIALIST FINDINGS, PROMPT SURGEON PATCHES (only if selected), RED TEAM ATTACK SCENARIOS (only if selected), STRESS LAB QUALITY GAPS (only if selected), PRIORITY ORDER, REGRESSION TESTS. Keep recommendations minimal, testable and non-duplicative.";
    const context=$("ptwUseContext").checked?contextBankMaterial(baseline.prompt):"Not supplied.";
    const user="OBJECTIVE:\n"+($("ptwObjective").value.trim()||"Assess the prompt for the most relevant quality risks.")+"\n\nSELECTED SPECIALISTS:\n"+routeNames(baseline.route).join(", ")+"\n\nSTRESS LAB DEPTH:\n"+baseline.stressMode+"\n\nTARGET PROMPT:\n"+baseline.prompt.slice(0,20000)+"\n\nLOCAL SPECIALIST EVIDENCE:\n"+baseline.sections.map(section=>"### "+section.title+"\n"+section.body).join("\n\n")+"\n\nOPTIONAL CONTEXT BANK MATERIAL:\n"+context+"\n\nReturn one integrated assessment. Do not repeat the entire local report.";
    try{const answer=await specialists.callAI(system,user,2600);if(runId!==activeRun)return;if(!answer||/^AI request failed:/i.test(String(answer))){const reason=String(answer||"").replace(/^AI request failed:\s*/i,"").trim()||"No AI provider is available.";toast("AI review failed: "+reason);$("ptwStatus").textContent="AI review failed: "+reason+" Local findings are preserved.";return;}const aiText=String(answer),report=buildReport(baseline.prompt,$("ptwObjective").value,baseline.route,baseline.sections,aiText);renderResults(baseline.sections,report,aiText);$("ptwStatus").textContent="Combined AI review complete. One request used for "+routeNames(baseline.route).join(", ")+".";
      $("ptwVerdict").textContent="AI REVIEWED";
    }catch(_){toast("AI review failed. The local assessment remains available.");$("ptwStatus").textContent="AI review failed. Local findings are preserved.";}
    finally{if(runId===activeRun){button.disabled=false;button.textContent="Run combined AI review";}}
  }
  function contextBankMaterial(prompt){
    try{
      const blocks=JSON.parse(localStorage.getItem("pl_ctx_blocks")||"[]");
      const terms=new Set(String(prompt||"").toLowerCase().match(/[a-z0-9]{4,}/g)||[]);
      const ranked=(Array.isArray(blocks)?blocks:[]).map(block=>{const content=String((block.title||"")+" "+(block.content||""));const score=(content.toLowerCase().match(/[a-z0-9]{4,}/g)||[]).filter(word=>terms.has(word)).length;return{block,score};}).filter(item=>item.score>0).sort((a,b)=>b.score-a.score).slice(0,2);
      return ranked.map(item=>"Context block: "+item.block.title+"\n"+String(item.block.content||"").slice(0,1400)).join("\n\n").slice(0,2800)||"No relevant Context Bank blocks found.";
    }catch(_){return "Context Bank material could not be read.";}
  }
  function renderPatterns(){
    const root=$("ptwPatternSummary"),core=window.PLStressLabCore;
    if(!root)return;
    const items=core&&typeof core.patterns==="function"?core.patterns():[];
    root.textContent=items.length?"Recurring local QA patterns: "+items.map(item=>item.label+" ("+item.count+")").join(", "):"No recurring QA patterns recorded on this device yet.";
  }
  function exportPatterns(){
    let patterns={};try{patterns=JSON.parse(localStorage.getItem("promptlib.stresslab.patterns.v1")||"{}");}catch(_){}
    const data={type:"prompt-library-stress-patterns",version:1,patterns};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    if(typeof window.PL_saveBlob==="function"){window.PL_saveBlob(blob,"prompt-testing-patterns.json","QA patterns exported");return;}
    const url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download="prompt-testing-patterns.json";link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
  }
  async function copyReport(){if(!lastReport){toast("Run an assessment first.");return;}try{await navigator.clipboard.writeText(lastReport);toast("Combined report copied.");}catch(_){toast("Clipboard access is unavailable.");}}
  async function saveReport(){if(!lastReport){toast("Run an assessment first.");return;}try{const response=await fetch("/api/prompts",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:"Prompt Testing Report, "+new Date().toLocaleDateString("en-GB"),content:lastReport,description:"Combined Prompt Surgeon, Red Team and Stress Lab assessment. Original prompt unchanged.",categories:"Prompt QA",tags:"prompt-testing,quality-assurance"})});if(!response.ok)throw new Error("Save failed");promptCache=null;toast("Combined report saved to Library.");}catch(_){toast("Could not save the report.");}}
  function close(){const root=$(ROOT_ID);if(root)root.classList.remove("open");if(window.PLNewWorkspaceSuite)window.PLNewWorkspaceSuite.close();if(opener&&opener.isConnected&&typeof opener.focus==="function")opener.focus({preventScroll:true});opener=null;}
  function onClick(event){if(event.target.closest("[data-ptw-close]")){close();return;}if(event.target.closest("#ptwLocal")){localRun();return;}if(event.target.closest("#ptwAI")){aiRun();return;}if(event.target.closest("#ptwCopy")){copyReport();return;}if(event.target.closest("#ptwSave")){saveReport();return;}if(event.target.closest("#ptwExportPatterns")){exportPatterns();return;}}
  function open(){
    if(!document.body.classList.contains("is-premium")){toast("Activate Prompt Library Pro to open this workspace.");return;}
    opener=document.activeElement;addStyles();shell();if(window.PLNewWorkspaceSuite)window.PLNewWorkspaceSuite.close();$("ptwRoute").value="auto";
    $(ROOT_ID).classList.add("open");document.body.classList.add("plx-workspace-open");
    if(window.PLWS&&typeof window.PLWS.noteOpened==="function")window.PLWS.noteOpened("openPlxSurgeonWorkspace");
    fillPicker();updateRouteSummary();renderPatterns();$("ptwPrompt").focus();
  }
  document.addEventListener("keydown",event=>{if(event.key==="Escape"&&$(ROOT_ID)&&$(ROOT_ID).classList.contains("open"))close();});
  window.openPromptTestingWorkspace=open;window.openPromptStressLabWorkspace=open;
})();