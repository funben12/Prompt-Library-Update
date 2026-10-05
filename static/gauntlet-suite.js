(function(){
  "use strict";

  const SUITE = {
    promptCache: null,
    active: null,
    ids: ["plxSurgeonWorkspace","plxTeammateWorkspace","plxWorkflowWorkspace","plxTestLabWorkspace"]
  };

  const $ = id => document.getElementById(id);
  const esc = value => String(value == null ? "" : value)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;");

  function closeSuite(){
    SUITE.ids.forEach(id => $(id)?.classList.remove("open"));
    document.body.classList.remove("plx-workspace-open");
    SUITE.active = null;
  }

  function openSuite(id){
    closeSuite();
    const el = $(id);
    if(!el) return;
    el.classList.add("open");
    document.body.classList.add("plx-workspace-open");
    SUITE.active = id;
    el.querySelector("textarea,input,select")?.focus();
  }

  async function loadPrompts(){
    if(SUITE.promptCache) return SUITE.promptCache;
    try{
      const r = await fetch("/api/prompts",{credentials:"same-origin"});
      if(!r.ok) throw new Error("Prompt library unavailable");
      const data = await r.json();
      SUITE.promptCache = Array.isArray(data) ? data : (data.prompts || []);
    }catch(_){
      SUITE.promptCache = [];
    }
    return SUITE.promptCache;
  }

  async function fillPicker(select, onPick){
    if(!select) return;
    select.innerHTML = '<option value="">Choose a saved prompt...</option>';
    const prompts = await loadPrompts();
    prompts.slice(0,250).forEach(p=>{
      const o=document.createElement("option");
      o.value=p.id;
      o.textContent=p.title || "Untitled prompt";
      select.appendChild(o);
    });
    select.addEventListener("change",()=>{
      const p=prompts.find(x=>String(x.id)===String(select.value));
      if(p) onPick(p);
    });
  }

  async function callAI(system, user, maxTokens){
    try{
      if(window.PLBridge && typeof window.PLBridge.callAI==="function"){
        return await window.PLBridge.callAI(system,user,maxTokens||1800);
      }
      if(typeof window.callAI==="function") return await window.callAI(system,user,maxTokens||1800);
    }catch(err){
      return "AI request failed: " + (err?.message || String(err));
    }
    return "";
  }

  async function savePrompt(title, content, description){
    try{
      const r=await fetch("/api/prompts",{
        method:"POST",
        credentials:"same-origin",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          title:title || "Workspace result",
          content:content,
          description:description || "",
          categories:"AI Workspace",
          tags:"workspace"
        })
      });
      if(!r.ok) throw new Error("Save failed");
      SUITE.promptCache=null;
      return true;
    }catch(_){
      return false;
    }
  }

  function toast(message){
    if(typeof window.PL_toast==="function") return window.PL_toast(message);
    const box=document.createElement("div");
    box.className="plx-toast";
    box.textContent=message;
    document.body.appendChild(box);
    setTimeout(()=>box.remove(),2400);
  }

  function mountPromptPicker(selectId, targetId){
    fillPicker($(selectId),p=>{
      const target=$(targetId);
      if(target) target.value=p.content || "";
    });
  }

  function setOutput(id, text){
    const el=$(id);
    if(el) el.textContent=text || "";
  }

  function localSurgeon(prompt){
    const text=String(prompt||"").trim();
    if(!text) return "Paste a prompt first.";
    const sentences=text.split(/(?<=[.!?])\s+/).filter(Boolean);
    const headings=(text.match(/^[A-Z][^:\n]{2,60}:/gm)||[]).length;
    const vars=(text.match(/\[\[[^\]]+\]\]|\{\{[^}]+\}\}/g)||[]).length;
    const issues=[];
    if(text.length>2500) issues.push("High length, look for duplicated instructions and repeated context.");
    if((text.match(/\b(must|always|never|ensure|should)\b/gi)||[]).length>12) issues.push("Constraint density is high, separate hard rules from preferences.");
    if(sentences.length>18) issues.push("Instruction flow is long, group related actions into explicit phases.");
    if(!vars && /\b(input|context|user|audience)\b/i.test(text)) issues.push("Inputs are referenced but not clearly parameterised.");
    if(!headings) issues.push("No visible section structure, consider Role, Goal, Inputs, Process, Constraints, Output, Quality.");
    return [
      "PROMPT SURGEON REPORT",
      "",
      "Length: "+text.length+" characters",
      "Sentences: "+sentences.length,
      "Visible sections: "+headings,
      "Variables: "+vars,
      "",
      "Largest gaps:",
      ...(issues.length?issues.map(x=>"• "+x):["• No obvious structural defect found. Test the prompt against real outputs."]),
      "",
      "Repair direction:",
      "Preserve intent, remove repetition, turn vague preferences into observable rules, and make the output contract explicit."
    ].join("\n");
  }

  async function runSurgeon(){
    const input=$("plxSurgeonInput")?.value.trim();
    if(!input) return setOutput("plxSurgeonOutput","Paste a prompt first.");
    const local=localSurgeon(input);
    setOutput("plxSurgeonOutput",local+"\n\nAI REPAIR\nRunning...");
    const ai=await callAI(
      "You are a ruthless prompt surgeon. Diagnose the real prompt, preserve its intent, remove redundancy, expose ambiguity, and produce a materially stronger replacement. Be concrete.",
      "PROMPT TO SURGEON:\n"+input+"\n\nLOCAL DIAGNOSIS:\n"+local,
      2200
    );
    setOutput("plxSurgeonOutput",local+(ai? "\n\nAI REPAIR\n"+ai:""));
  }

  function runTeammateLocal(){
    const mission=$("plxTeamMission").value.trim();
    const role=$("plxTeamRole").value.trim();
    const tools=$("plxTeamTools").value.trim();
    const boundaries=$("plxTeamBoundaries").value.trim();
    if(!mission) return setOutput("plxTeammateOutput","Give the teammate a mission first.");
    const spec=[
      "# AI TEAMMATE SPEC",
      "",
      "## Mission",
      mission,
      "",
      "## Role",
      role || "Strategic operator who acts on the user's objective rather than merely answering the latest message.",
      "",
      "## Tools / capabilities",
      tools || "Prompt library, local files, research, structured planning and user approved external actions.",
      "",
      "## Operating loop",
      "1. Understand the objective and success condition.",
      "2. Inspect available context before acting.",
      "3. Break complex work into independently judgeable pieces.",
      "4. Build, inspect, criticise, revise.",
      "5. Report the result, evidence and next action.",
      "",
      "## Boundaries",
      boundaries || "Do not invent results, do not hide failures, ask only when blocked, preserve user data and existing project structure.",
      "",
      "## Output contract",
      "State the decision, show the useful artifact, identify remaining uncertainty, and make the next action obvious."
    ].join("\n");
    setOutput("plxTeammateOutput",spec);
    return spec;
  }

  async function runTeammate(){
    const spec=runTeammateLocal();
    if(!spec || spec.startsWith("Give the teammate")) return;
    const ai=await callAI(
      "You design practical AI teammates. Strengthen the supplied teammate specification without bloating it. Preserve the user's intent. Add missing agency, memory, tool discipline, failure behaviour and quality gates only where they materially improve the system.",
      spec,
      2200
    );
    if(ai) setOutput("plxTeammateOutput",spec+"\n\n## DESIGN REVIEW\n"+ai);
  }

  function runWorkflowLocal(){
    const goal=$("plxFlowGoal").value.trim();
    const inputs=$("plxFlowInputs").value.trim();
    const constraints=$("plxFlowConstraints").value.trim();
    if(!goal) return setOutput("plxWorkflowOutput","Give the workflow a goal first.");
    const result=[
      "# WORKFLOW ARCHITECTURE",
      "",
      "GOAL",
      goal,
      "",
      "INPUTS",
      inputs || "User objective, available context, source material and constraints.",
      "",
      "STAGES",
      "01. Intake, establish the desired outcome and acceptance criteria.",
      "02. Context, gather only information that can change the decision.",
      "03. Decompose, split the work into independently judgeable pieces.",
      "04. Build, produce the smallest useful working artifact.",
      "05. Verify, inspect the real output against the acceptance criteria.",
      "06. Critique, identify the largest remaining gap.",
      "07. Iterate, repair the highest impact gap.",
      "08. Package, return the final artifact plus evidence and next action.",
      "",
      "CONSTRAINTS",
      constraints || "Do not over-engineer. Preserve existing data. Surface uncertainty and failed checks.",
      "",
      "QUALITY GATE",
      "The workflow is not complete because it ran. It is complete when the output passes the stated acceptance criteria."
    ].join("\n");
    setOutput("plxWorkflowOutput",result);
    return result;
  }

  async function runWorkflow(){
    const result=runWorkflowLocal();
    if(!result || result.startsWith("Give the workflow")) return;
    const ai=await callAI(
      "You are a workflow systems architect. Critique the proposed workflow, remove unnecessary steps, add missing gates only when justified, and return a concise production-ready workflow.",
      result,
      2200
    );
    if(ai) setOutput("plxWorkflowOutput",result+"\n\n## ARCHITECT REVIEW\n"+ai);
  }

  function buildTests(){
    const prompt=$("plxTestPrompt").value.trim();
    const cases=Number($("plxTestCount").value)||6;
    if(!prompt) return setOutput("plxTestOutput","Paste a prompt first.");
    const dimensions=[
      ["Instruction fidelity","Does it follow the explicit task without drifting?"],
      ["Output contract","Does the result match the requested format and completeness?"],
      ["Ambiguity resistance","Does it behave sensibly when the input is underspecified?"],
      ["Constraint handling","Does it obey hard limits without silently dropping them?"],
      ["Adversarial pressure","Does it resist conflicting or manipulative instructions?"],
      ["Consistency","Does it produce stable quality across materially different inputs?"],
      ["Edge case recovery","Does it surface missing information instead of inventing it?"],
      ["Efficiency","Does it avoid unnecessary verbosity and repeated work?"]
    ];
    const chosen=dimensions.slice(0,Math.min(cases,dimensions.length));
    const out=[
      "PROMPT TEST LAB",
      "",
      "Target length: "+prompt.length+" characters",
      "",
      ...chosen.map((d,i)=>(i+1)+". "+d[0]+"\n   Test: "+d[1]+"\n   Pass condition: observable evidence in the output\n   Verdict: NOT RUN"),
      "",
      "BLIND COMPARISON",
      "Run the same test set against the current prompt and the revised candidate without revealing which is which. Prefer the candidate that wins on more dimensions with fewer regressions."
    ].join("\n");
    setOutput("plxTestOutput",out);
    return out;
  }

  async function runTests(){
    const base=buildTests();
    if(!base || base.startsWith("Paste a prompt")) return;
    const prompt=$("plxTestPrompt").value.trim();
    const ai=await callAI(
      "You are an adversarial prompt evaluator. Create concrete test cases and scoring guidance for the target prompt. Focus on observable behaviour, failure modes and blind A/B comparison. Do not grade the prompt from its prose alone.",
      "TARGET PROMPT:\n"+prompt+"\n\nTEST PLAN:\n"+base,
      2600
    );
    if(ai) setOutput("plxTestOutput",base+"\n\n## CRITIC EXPANSION\n"+ai);
  }

  function bind(){
    document.addEventListener("click",e=>{
      const trigger=e.target.closest("[data-open]");
      if(trigger){
        const id=trigger.getAttribute("data-open");
        if(SUITE.ids.includes(id)){
          e.preventDefault();
          openSuite(id);
        }
      }
      const close=e.target.closest("[data-plx-close]");
      if(close){e.preventDefault();closeSuite();}
      const copy=e.target.closest("[data-plx-copy]");
      if(copy){
        const id=copy.getAttribute("data-plx-copy");
        const text=$(id)?.textContent||$(id)?.value||"";
        navigator.clipboard?.writeText(text).then(()=>toast("Copied"));
      }
      const save=e.target.closest("[data-plx-save]");
      if(save){
        const source=$(save.getAttribute("data-plx-save"));
        const text=source?.textContent||"";
        if(text) savePrompt(save.dataset.title||"Workspace result",text,save.dataset.description||"").then(ok=>toast(ok?"Saved to Library":"Could not save result"));
      }
    });

    document.addEventListener("keydown",e=>{
      if(e.key==="Escape" && SUITE.active) closeSuite();
    });

    $("plxSurgeonRun")?.addEventListener("click",runSurgeon);
    $("plxTeammateRun")?.addEventListener("click",runTeammate);
    $("plxWorkflowRun")?.addEventListener("click",runWorkflow);
    $("plxTestRun")?.addEventListener("click",runTests);
    $("plxBarRun")?.addEventListener("click",runBarForge);
    $("plxRedTeamRun")?.addEventListener("click",runRedTeam);
    $("plxSurgeonPicker") && mountPromptPicker("plxSurgeonPicker","plxSurgeonInput");
    $("plxTestPicker") && mountPromptPicker("plxTestPicker","plxTestPrompt");
  }

  function init(){
    if(window.__PLX_SUITE_READY) return;
    window.__PLX_SUITE_READY=true;
    bind();
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init);
  else init();


  window.openPlxSurgeonWorkspace=()=>openSuite("plxSurgeonWorkspace");
  window.openPlxTeammateWorkspace=()=>openSuite("plxTeammateWorkspace");
  window.openPlxWorkflowWorkspace=()=>openSuite("plxWorkflowWorkspace");
  window.openPlxTestLabWorkspace=()=>openSuite("plxTestLabWorkspace");


  function runBarForge(){
    const goal=$("plxBarGoal")?.value.trim(), refs=$("plxBarRefs")?.value.trim(), constraints=$("plxBarConstraints")?.value.trim();
    if(!goal){setOutput("plxBarOutput","Describe the thing you want to build first.");return;}
    const base=["QUALITY BAR FORGE","","GOAL",goal,"","REFERENCE MATERIAL",refs||"No reference supplied. Find a concrete exemplar or measurable benchmark before building.","","NON NEGOTIABLES",constraints||"None supplied.","","STOP CONDITION","Do not stop at subjective quality. The critic must inspect the real output, compare it against the chosen bar, state which is better, identify the largest gap, and loop until ours wins or the user stops the run."].join("\n");
    setOutput("plxBarOutput",base+"\n\nAI FORGE\nRunning...");
    callAI("You are a ruthless quality bar designer using the Gauntlet Loop method. Choose the strongest concrete, inspectable comparison or measurement. Avoid vague adjectives. Produce a concise bar, evidence to inspect, and a comparative stop condition.",base,2200).then(ai=>{if(ai)setOutput("plxBarOutput",base+"\n\nAI FORGE\n"+ai);});
  }

  function runRedTeam(){
    const input=$("plxRedTeamInput")?.value.trim();
    if(!input){setOutput("plxRedTeamOutput","Paste a prompt first.");return;}
    const local=["RED TEAM CHECKLIST","","1. Ambiguity, find instructions with multiple valid interpretations.","2. Conflicts, find rules that collide under pressure.","3. Missing inputs, identify where the model may invent information.","4. Boundary pressure, test extreme, empty, oversized and malformed inputs.","5. Instruction priority, test accidental overrides.","6. Output drift, find ways to answer technically while missing the real goal.","7. Self grading, find places where success can be declared without evidence.","8. Regression risk, identify changes that could improve one case while damaging another.","","TARGET PROMPT",input].join("\n");
    setOutput("plxRedTeamOutput",local+"\n\nAI ATTACK\nRunning...");
    callAI("You are a hostile but fair prompt red team critic. Attack the supplied prompt with concrete adversarial scenarios. Prioritise confident failure modes. For each serious weakness, give a minimal fix and a test proving the fix works.",local,2500).then(ai=>{if(ai)setOutput("plxRedTeamOutput",local+"\n\nAI ATTACK\n"+ai);});
  }

  window.openPlBarForgeWorkspace=()=>openSuite("plxBarForgeWorkspace");
  window.openPlRedTeamWorkspace=()=>openSuite("plxRedTeamWorkspace");

  window.PLNewWorkspaceSuite={open:openSuite,close:closeSuite};
})();