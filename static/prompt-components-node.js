/* Prompt Components Node Canvas v1, vanilla implementation */
(function(){
  "use strict";
  const NS="pln";
  let root, canvas, world, svg, palette, inspector, state;
  let drag=null, pan=null, connect=null, marquee=null, history=[], future=[], saveTimer=null;
  const clone=o=>JSON.parse(JSON.stringify(o));
  const uid=p=>p+"_"+Math.random().toString(36).slice(2,10);
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const blocks=()=>[...(window._pcwBLOCKS||[]),...(state?.customBlocks||[]),...(window._pcwFRAMEWORKS||[]).map((f,i)=>({id:"framework:"+i,label:f.name||f.title||"Framework",text:f.template||f.prompt||f.description||"",icon:"schema",cat:"framework"}))];
  const blank=()=>({id:null,title:"",nodes:[],edges:[],view:{x:80,y:60,z:1},selected:[],groups:[],dirty:false,snap:true,customBlocks:[]});
  function api(url,opt={}){return fetch(url,{credentials:"same-origin",headers:{"Content-Type":"application/json",...(opt.headers||{})},...opt});}
  function defaultConfig(definition){const config={};(definition?.settings||[]).forEach(setting=>{config[setting.id]=setting.default??(setting.type==="checkbox"?false:"");});return config;}
  function nodeDef(b,x,y){const definition=clone(b.definition||{}),ports=Math.max((definition.inputs||[]).length,(definition.outputs||[]).length);return {id:uid("n"),block_ref:String(b.id||b.label||uid("b")),label:b.label||b.name||"Component",text:b.text||b.body||"",definition,config:defaultConfig(definition),x,y,z_index:0,collapsed:false,width:definition.schema?320:260,height:definition.schema?Math.max(170,142+ports*24):140};}
  function snapshot(){history.push(clone({nodes:state.nodes,edges:state.edges,view:state.view,groups:state.groups}));if(history.length>80)history.shift();future=[];}
  function undo(){if(!history.length)return;future.push(clone({nodes:state.nodes,edges:state.edges,view:state.view,groups:state.groups}));const s=history.pop();Object.assign(state,s);render();}
  function redo(){if(!future.length)return;history.push(clone({nodes:state.nodes,edges:state.edges,view:state.view,groups:state.groups}));const s=future.pop();Object.assign(state,s);render();}
  function screenToWorld(clientX,clientY){const r=canvas.getBoundingClientRect();return{x:(clientX-r.left-state.view.x)/state.view.z,y:(clientY-r.top-state.view.y)/state.view.z};}
  function applyView(){const transform="translate("+state.view.x+"px,"+state.view.y+"px) scale("+state.view.z+")";world.style.transform=transform;svg.style.transform=transform;svg.style.transformOrigin="0 0";svg.setAttribute("width",Math.max(canvas.clientWidth/state.view.z+2000,4000));svg.setAttribute("height",Math.max(canvas.clientHeight/state.view.z+2000,4000));}
  function pathFor(a,b){const dx=Math.max(40,Math.abs(b.x-a.x)*.5);return "M "+a.x+" "+a.y+" C "+(a.x+dx)+" "+a.y+", "+(b.x-dx)+" "+b.y+", "+b.x+" "+b.y;}
  function point(n,side){const definition=n.definition||{};if(side.startsWith("in:")){const i=(definition.inputs||[]).findIndex(p=>p.id===side.slice(3));return{x:n.x,y:n.y+52+Math.max(0,i)*24};}if(side.startsWith("out:")){const i=(definition.outputs||[]).findIndex(p=>p.id===side.slice(4));return{x:n.x+(n.width||320),y:n.y+52+Math.max(0,i)*24};}if(side==="left")return{x:n.x,y:n.y+n.height/2};if(side==="right")return{x:n.x+n.width,y:n.y+n.height/2};if(side==="top")return{x:n.x+n.width/2,y:n.y};return{x:n.x+n.width/2,y:n.y+n.height};}
  function relationAllowed(a,b){return a&&b&&a.id!==b.id;}
  function buildPrompt(){
    const map=new Map(state.nodes.map(n=>[n.id,n]));
    const indeg=new Map(state.nodes.map(n=>[n.id,0]));
    const out=new Map(state.nodes.map(n=>[n.id,[]]));
    state.edges.forEach(e=>{if(indeg.has(e.target))indeg.set(e.target,indeg.get(e.target)+1);if(out.has(e.source))out.get(e.source).push(e)});
    const roots=state.nodes.filter(n=>(indeg.get(n.id)||0)===0).sort((a,b)=>a.y-b.y||a.x-b.x);
    const seen=new Set(),active=new Set(),result=[],warnings=[];
    function walk(n,depth){
      if(!n)return;
      const pad="  ".repeat(Math.min(depth,8));
      if(active.has(n.id)){warnings.push("Cycle detected at "+n.label);result.push(pad+"[Cycle omitted: "+n.label+"]");return;}
      if(seen.has(n.id)){result.push(pad+"[Converges with "+n.label+"]");return;}
      active.add(n.id);
      const definition=n.definition||{},config=n.config||{};
      let text=(n.text||"").trim();
      if(definition.schema){
        text=text.replace(/\{\{setting:([\w-]+)\}\}/g,(_,key)=>String(config[key]??""));
        text=text.replace(/\{\{input:([\w-]+)\}\}/g,(_,key)=>{const port=(definition.inputs||[]).find(p=>p.id===key);const edge=state.edges.find(e=>e.target===n.id&&e.target_port==="in:"+key);const source=edge&&map.get(edge.source);return source?"[Input "+(port?.name||key)+" from "+source.label+"]":"[Input "+(port?.name||key)+"]";});
        text=text.replace(/\{\{output:([\w-]+)\}\}/g,(_,key)=>{const port=(definition.outputs||[]).find(p=>p.id===key);return "[Output "+(port?.name||key)+"]";});
        const contracts=[];
        if((definition.inputs||[]).length)contracts.push("INPUTS:\n"+definition.inputs.map(p=>"- "+p.name+" ("+p.type+")"+(p.required?" required":" optional")).join("\n"));
        if((definition.outputs||[]).length)contracts.push("OUTPUTS:\n"+definition.outputs.map(p=>"- "+p.name+" ("+p.type+")").join("\n"));
        if((definition.settings||[]).length)contracts.push("CONFIGURATION:\n"+definition.settings.map(p=>"- "+p.name+": "+String(config[p.id]??p.default??"")).join("\n"));
        if(contracts.length)result.push(pad+"["+n.label+"]\n"+contracts.join("\n"));
      }
      if(text)result.push(pad+text);
      const children=(out.get(n.id)||[]).map(e=>({edge:e,node:map.get(e.target)})).filter(x=>x.node).sort((a,b)=>a.node.y-b.node.y||a.node.x-b.node.x);
      if(children.length>1){children.forEach((item,i)=>{result.push("");result.push(pad+"[Branch "+(i+1)+(item.node.label?": "+item.node.label:"")+"]");walk(item.node,depth+1);});}
      else if(children.length===1){walk(children[0].node,depth);}
      seen.add(n.id);active.delete(n.id);
    }
    roots.forEach((n,i)=>{if(i)result.push("");walk(n,0);});
    state.nodes.slice().sort((a,b)=>a.y-b.y||a.x-b.x).forEach(n=>{if(!seen.has(n.id)){result.push("");result.push("[Additional graph component]");walk(n,0);}});
    return {text:result.filter(Boolean).join("\n").trim(),warnings};
  }
  function slugify(value){return String(value||"").toLowerCase().trim().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"").slice(0,36);}
  function addStudioPort(host,kind,item={}){
    const row=document.createElement("div");row.className="pln-studio-row";row.dataset.kind=kind;
    if(kind==="setting"){
      row.innerHTML='<input data-field="id" aria-label="Setting key" placeholder="agent_count" value="'+esc(item.id||"")+'"><input data-field="name" aria-label="Setting name" placeholder="Agent count" value="'+esc(item.name||"")+'"><select data-field="type" aria-label="Setting type"><option value="text">Text</option><option value="textarea">Long text</option><option value="number">Number</option><option value="select">Dropdown</option><option value="checkbox">Toggle</option></select><input data-field="default" aria-label="Default value" placeholder="Default value" value="'+esc(item.default??"")+'"><input data-field="options" aria-label="Dropdown options" placeholder="Options, comma separated" value="'+esc((item.options||[]).join(", "))+'"><button type="button" class="pln-studio-remove" aria-label="Remove setting">×</button>';
      row.querySelector('[data-field="type"]').value=item.type||"text";
    }else{
      row.innerHTML='<input data-field="id" aria-label="Port key" placeholder="task" value="'+esc(item.id||"")+'"><input data-field="name" aria-label="Port name" placeholder="Task" value="'+esc(item.name||"")+'"><select data-field="type" aria-label="Port data type"><option value="text">Text</option><option value="prompt">Prompt</option><option value="json">JSON</option><option value="number">Number</option><option value="boolean">Boolean</option><option value="file">File or asset</option></select><label class="pln-studio-required"><input data-field="required" type="checkbox" '+(item.required?"checked":"")+'> Required</label><button type="button" class="pln-studio-remove" aria-label="Remove port">×</button>';
      row.querySelector('[data-field="type"]').value=item.type||"text";
    }
    row.querySelector(".pln-studio-remove").onclick=()=>row.remove();host.appendChild(row);return row;
  }
  function openBlockStudio(existing){
    const editing=!!existing,definition=clone(existing?.definition||{});
    const overlay=document.createElement("div");overlay.className="pln-studio-overlay";
    overlay.innerHTML='<section class="pln-studio-dialog" role="dialog" aria-modal="true" aria-labelledby="plnStudioTitle"><header class="pln-studio-head"><div><span class="pln-studio-kicker">PROMPT COMPONENTS / BLOCK LIBRARY</span><h2 id="plnStudioTitle">'+(editing?"Edit custom block":"Block Creation Studio")+'</h2><p>Define the node, its connection contract and the settings people can configure when they use it.</p></div><button type="button" class="pln-studio-close" aria-label="Close">×</button></header><div class="pln-studio-body"><div class="pln-studio-main"><section class="pln-studio-section"><div class="pln-studio-section-head"><div><h3>Block identity</h3><p>Name it and decide where it lives in your library.</p></div></div><div class="pln-studio-grid"><label>Block name<input id="plnStudioName" placeholder="e.g. Multi-agent coordinator" value="'+esc(existing?.name||"")+'"></label><label>Library category<input id="plnStudioCategory" placeholder="My blocks" value="'+esc(existing?.cat||"My blocks")+'"></label><label>Icon name<input id="plnStudioIcon" placeholder="hub" value="'+esc(definition.icon||"hub")+'"></label><label>Description<input id="plnStudioDescription" placeholder="What this block is responsible for" value="'+esc(existing?.description||"")+'"></label></div></section><section class="pln-studio-section"><div class="pln-studio-section-head"><div><h3>Inputs and outputs</h3><p>Give this node named connection points. Outputs connect to inputs.</p></div><span class="pln-studio-count" id="plnStudioPortCount">0 IN / 0 OUT</span></div><div class="pln-studio-port-groups"><div><div class="pln-studio-subhead"><strong>Inputs</strong><button type="button" class="pln-studio-add" id="plnStudioAddInput">+ Add input</button></div><div class="pln-studio-rows" id="plnStudioInputs"></div></div><div><div class="pln-studio-subhead"><strong>Outputs</strong><button type="button" class="pln-studio-add" id="plnStudioAddOutput">+ Add output</button></div><div class="pln-studio-rows" id="plnStudioOutputs"></div></div></div></section><section class="pln-studio-section"><div class="pln-studio-section-head"><div><h3>Adjustable settings</h3><p>Expose controls such as agent count, model choice, temperature or review rounds.</p></div><button type="button" class="pln-studio-add" id="plnStudioAddSetting">+ Add setting</button></div><div class="pln-studio-rows pln-studio-settings" id="plnStudioSettings"></div></section><section class="pln-studio-section"><div class="pln-studio-section-head"><div><h3>Block instructions</h3><p>Write the reusable prompt logic. Use the tokens below to insert values from the node.</p></div></div><div class="pln-studio-token-row"><button type="button" data-token="{{input:task}}">+ Input token</button><button type="button" data-token="{{setting:agent_count}}">+ Setting token</button><button type="button" data-token="{{output:result}}">+ Output token</button></div><textarea id="plnStudioBody" class="pln-studio-template" placeholder="Describe what this block does, how it should use its inputs and what it must return.">'+esc(existing?.body||"")+'</textarea><div class="pln-studio-example"><strong>Example preset</strong><button type="button" id="plnStudioMultiAgent">Load a multi-agent block example</button><span>Creates a starter with task and context inputs, synthesis and critique outputs, and adjustable agent settings.</span></div></section></div><aside class="pln-studio-preview"><span class="pln-studio-kicker">LIVE NODE PREVIEW</span><div class="pln-studio-preview-card" id="plnStudioPreview"></div><p>These ports become visible connection points when this block is placed on the canvas.</p></aside></div><footer class="pln-studio-foot"><span id="plnStudioStatus">Your block is saved locally in the component library.</span><div><button type="button" class="pln-studio-cancel">Cancel</button><button type="button" class="pln-studio-save" id="plnStudioSave">'+(editing?"Save changes":"Create block")+'</button></div></footer></section>';
    document.body.appendChild(overlay);
    const $=selector=>overlay.querySelector(selector),inputs=$("#plnStudioInputs"),outputs=$("#plnStudioOutputs"),settings=$("#plnStudioSettings");
    const refresh=()=>{const ins=inputs.querySelectorAll(".pln-studio-row").length,outs=outputs.querySelectorAll(".pln-studio-row").length;$("#plnStudioPortCount").textContent=ins+" IN / "+outs+" OUT";const name=$("#plnStudioName").value.trim()||"Untitled custom block";$("#plnStudioPreview").innerHTML='<div class="pln-studio-preview-title">'+esc(name)+'</div><div class="pln-studio-preview-ports"><div><b>INPUTS</b>'+Array.from(inputs.querySelectorAll(".pln-studio-row")).map(row=>'<span class="in">'+esc(row.querySelector('[data-field="name"]').value||"Unnamed input")+'</span>').join("")+'</div><div><b>OUTPUTS</b>'+Array.from(outputs.querySelectorAll(".pln-studio-row")).map(row=>'<span class="out">'+esc(row.querySelector('[data-field="name"]').value||"Unnamed output")+'</span>').join("")+'</div></div><small>'+settings.querySelectorAll(".pln-studio-row").length+' configurable settings</small>';};
    const add=(kind,item)=>{const host=kind==="input"?inputs:kind==="output"?outputs:settings;addStudioPort(host,kind,item);refresh();};
    (definition.inputs||[]).forEach(item=>add("input",item));(definition.outputs||[]).forEach(item=>add("output",item));(definition.settings||[]).forEach(item=>add("setting",item));
    if(!editing){add("input",{id:"input_1",name:"Input 1",type:"text",required:true});add("output",{id:"output_1",name:"Output 1",type:"text"});}
    $("#plnStudioAddInput").onclick=()=>add("input");$("#plnStudioAddOutput").onclick=()=>add("output");$("#plnStudioAddSetting").onclick=()=>add("setting");
    overlay.addEventListener("input",refresh);
    $("#plnStudioMultiAgent").onclick=()=>{
      inputs.innerHTML="";outputs.innerHTML="";settings.innerHTML="";
      add("input",{id:"task",name:"Task brief",type:"prompt",required:true});
      add("input",{id:"context",name:"Shared context",type:"text",required:false});
      add("input",{id:"constraints",name:"Constraints",type:"text",required:false});
      add("output",{id:"synthesis",name:"Final synthesis",type:"text"});
      add("output",{id:"critique",name:"Independent critique",type:"text"});
      add("output",{id:"confidence",name:"Confidence assessment",type:"json"});
      add("setting",{id:"agent_count",name:"Number of agents",type:"number",default:3});
      add("setting",{id:"coordination",name:"Coordination method",type:"select",default:"Parallel then synthesise",options:["Parallel then synthesise","Sequential handoff","Debate and converge"]});
      add("setting",{id:"review_rounds",name:"Review rounds",type:"number",default:2});
      $("#plnStudioBody").value="Coordinate {{setting:agent_count}} specialist agents using the {{setting:coordination}} method.\n\nTask: {{input:task}}\nShared context: {{input:context}}\nConstraints: {{input:constraints}}\n\nEach agent should work independently before the coordinator compares findings. Run {{setting:review_rounds}} review rounds. Produce a final synthesis, an independent critique and a confidence assessment.";refresh();
    };
    overlay.querySelectorAll("[data-token]").forEach(button=>button.onclick=()=>{const area=$("#plnStudioBody"),token=button.dataset.token,start=area.selectionStart,end=area.selectionEnd;area.setRangeText(token,start,end,"end");area.focus();refresh();});
    const close=()=>overlay.remove();$(".pln-studio-close").onclick=close;$(".pln-studio-cancel").onclick=close;overlay.addEventListener("click",event=>{if(event.target===overlay)close();});overlay.addEventListener("keydown",event=>{if(event.key==="Escape"){event.preventDefault();close();}});
    $("#plnStudioName").focus();
    $("#plnStudioSave").onclick=async()=>{
      const name=$("#plnStudioName").value.trim(),body=$("#plnStudioBody").value.trim(),category=$("#plnStudioCategory").value.trim()||"My blocks";
      if(!name||!body){$("#plnStudioStatus").textContent="Add a block name and its instructions before saving.";return;}
      const collect=(host,kind)=>{const ids=new Set();return Array.from(host.querySelectorAll(".pln-studio-row")).map(row=>{const field=key=>row.querySelector('[data-field="'+key+'"]');const id=slugify(field("id").value||field("name").value);const label=field("name").value.trim();if(!id||!label||ids.has(id))throw new Error("Each "+kind+" needs a name and a unique key.");ids.add(id);if(kind==="setting"){const type=field("type").value;return{id,name:label,type,default:type==="checkbox"?/^(true|yes|1)$/i.test(field("default").value.trim()):(type==="number"?Number(field("default").value||0):field("default").value),options:type==="select"?field("options").value.split(",").map(x=>x.trim()).filter(Boolean):[]};}return{id,name:label,type:field("type").value,required:!!field("required").checked};});};
      let definition;try{definition={schema:1,kind:"custom",icon:$("#plnStudioIcon").value.trim()||"extension",inputs:collect(inputs,"input"),outputs:collect(outputs,"output"),settings:collect(settings,"setting")};}catch(error){$("#plnStudioStatus").textContent=error.message;return;}
      if(!definition.inputs.length&&!definition.outputs.length){$("#plnStudioStatus").textContent="Add at least one input or output port.";return;}
      if(definition.settings.some(setting=>setting.type==="select"&&!setting.options.length)){$("#plnStudioStatus").textContent="Add at least one option to each dropdown setting.";return;}
      const payload={name,category,body,description:$("#plnStudioDescription").value.trim(),definition};
      const button=$("#plnStudioSave");button.disabled=true;button.textContent="Saving...";
      try{const response=await api(editing?"/api/components/"+existing.dbId:"/api/components",{method:editing?"PUT":"POST",body:JSON.stringify(payload)});const result=await response.json();if(!response.ok)throw new Error(result.error||"The block could not be saved.");await loadCustomBlocks();renderPalette();close();toast(editing?"Custom block updated.":"Custom block added to your library.");}
      catch(error){$("#plnStudioStatus").textContent=error.message;button.disabled=false;button.textContent=editing?"Save changes":"Create block";}
    };
  }
  function renderPalette(){
    const list=palette.querySelector(".pln-palette-list"), q=palette.querySelector(".pln-search").value.toLowerCase();
    const arr=blocks().filter(b=>(b.label||b.name||"").toLowerCase().includes(q)||(b.text||b.body||"").toLowerCase().includes(q));
    const groups=new Map();arr.forEach(b=>{const k=b.cat||"components";if(!groups.has(k))groups.set(k,[]);groups.get(k).push(b)});
    list.innerHTML=[...groups.entries()].map(([cat,items])=>"<details class='pln-section' open><summary>"+esc(cat)+" <span>"+items.length+"</span></summary>"+items.slice(0,120).map((b,i)=>'<div class="pln-palette-entry"><button class="pln-palette-item" draggable="true" data-b="'+esc(b.id||b.label||i)+'"><span class="pln-palette-icon">'+esc((b.icon||"extension").slice(0,1).toUpperCase())+'</span><span class="pln-palette-copy"><strong>'+esc(b.label||b.name||"Component")+'</strong><span>'+esc((b.text||b.body||"").slice(0,80))+'</span></span></button>'+(b.source==="user"?'<button class="pln-palette-edit" type="button" data-edit-block="'+esc(b.id)+'" title="Edit block">Edit</button>':"")+"</div>").join("")+"</details>").join("");
    list.querySelectorAll(".pln-palette-item").forEach(btn=>{
      btn.addEventListener("dblclick",()=>{const r=canvas.getBoundingClientRect();addBlockByRef(btn.dataset.b,r.left+r.width/2,r.top+r.height/2);});
      btn.addEventListener("dragstart",e=>e.dataTransfer.setData("text/pln-block",btn.dataset.b));
    });
    list.querySelectorAll("[data-edit-block]").forEach(btn=>btn.addEventListener("click",()=>{const block=state.customBlocks.find(item=>String(item.id)===btn.dataset.editBlock);if(block)openBlockStudio(block);}));
  }
  function addBlockByRef(ref,x,y){
    const b=blocks().find(v=>String(v.id||v.label||"")===String(ref))||blocks().find(v=>String(v.label||"")===String(ref));if(!b)return;
    snapshot();const p=screenToWorld(x,y);state.nodes.push(nodeDef(b,p.x-120,p.y-55));state.selected=[state.nodes.at(-1).id];markDirty();render();
  }
  function nodeHtml(n){
    const definition=n.definition||{},inputs=definition.inputs||[],outputs=definition.outputs||[],custom=!!definition.schema;
    const portRows=custom?'<div class="pln-node-ports"><div class="pln-node-port-column inputs">'+inputs.map(p=>'<div class="pln-node-port-row input"><span class="pln-handle pln-port-handle" data-side="in:'+esc(p.id)+'" data-node="'+esc(n.id)+'"></span><span>'+esc(p.name)+'</span></div>').join("")+'</div><div class="pln-node-port-column outputs">'+outputs.map(p=>'<div class="pln-node-port-row output"><span>'+esc(p.name)+'</span><span class="pln-handle pln-port-handle" data-side="out:'+esc(p.id)+'" data-node="'+esc(n.id)+'"></span></div>').join("")+'</div></div>':'<span class="pln-handle left" data-side="left" data-node="'+esc(n.id)+'"></span><span class="pln-handle right" data-side="right" data-node="'+esc(n.id)+'"></span><span class="pln-handle top" data-side="top" data-node="'+esc(n.id)+'"></span><span class="pln-handle bottom" data-side="bottom" data-node="'+esc(n.id)+'"></span>';
    return '<div class="pln-node '+(state.selected.includes(n.id)?"selected":"")+'" data-node="'+esc(n.id)+'" style="left:'+n.x+'px;top:'+n.y+'px;width:'+(n.width||260)+'px;height:'+(n.height||140)+'px;z-index:'+(n.z_index||0)+'"><div class="pln-node-head" data-drag-node="'+esc(n.id)+'"><span class="pln-node-dot"></span><span class="pln-node-title">'+esc(n.label)+'</span><button class="pln-tool pln-node-menu" data-delete-node="'+esc(n.id)+'" title="Delete">×</button></div>'+portRows+'<textarea class="pln-node-edit" data-edit-node="'+esc(n.id)+'">'+esc(n.text)+'</textarea></div>';
  }
  function renderEdges(){
    svg.innerHTML='<defs><marker id="plnArrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"></path></marker></defs>';
    const map=new Map(state.nodes.map(n=>[n.id,n]));
    state.edges.forEach(e=>{
      const a=map.get(e.source),b=map.get(e.target);if(!a||!b)return;
      const sp=e.source_port||"right",tp=e.target_port||"left",p1=point(a,sp),p2=point(b,tp);
      const path=document.createElementNS("http://www.w3.org/2000/svg","path");
      path.setAttribute("d",pathFor(p1,p2));path.setAttribute("class","pln-edge "+(state.selected.includes("edge:"+e.id)?"selected":""));path.setAttribute("marker-end","url(#plnArrow)");path.dataset.edge=e.id;svg.appendChild(path);
      ["source","target"].forEach(side=>{const p=side==="source"?p1:p2;const dot=document.createElementNS("http://www.w3.org/2000/svg","circle");dot.setAttribute("cx",p.x);dot.setAttribute("cy",p.y);dot.setAttribute("r","5");dot.setAttribute("class","pln-edge-endpoint "+(state.selected.includes("edge:"+e.id)?"visible":""));dot.dataset.edge=e.id;dot.dataset.edgeEnd=side;svg.appendChild(dot);});
      if(e.relation&&e.relation!=="sequence"){const t=document.createElementNS("http://www.w3.org/2000/svg","text");t.setAttribute("x",(p1.x+p2.x)/2);t.setAttribute("y",(p1.y+p2.y)/2-5);t.setAttribute("class","pln-edge-label");t.textContent=e.relation;svg.appendChild(t);}
    });
    if(connect?.preview){const p1=connect.preview.start,p2=connect.preview.end||p1;const line=document.createElementNS("http://www.w3.org/2000/svg","path");line.setAttribute("d",pathFor(p1,p2,connect.side||"right","left"));line.setAttribute("class","pln-connection-preview");svg.appendChild(line);}
  }
  function render(){
    applyView();
    world.querySelectorAll(".pln-node,.pln-group-frame").forEach(e=>e.remove());
    state.groups.forEach(g=>{
      const members=state.nodes.filter(n=>g.nodes.includes(n.id));
      if(members.length<2)return;
      const minX=Math.min(...members.map(n=>n.x))-14,minY=Math.min(...members.map(n=>n.y))-28;
      const maxX=Math.max(...members.map(n=>n.x+n.width))+14,maxY=Math.max(...members.map(n=>n.y+n.height))+14;
      world.insertAdjacentHTML("beforeend",`<div class="pln-group-frame" style="left:${minX}px;top:${minY}px;width:${maxX-minX}px;height:${maxY-minY}px;z-index:-1"><span>${esc(g.label||"Prompt group")}</span></div>`);
    });
    state.nodes.forEach(n=>world.insertAdjacentHTML("beforeend",nodeHtml(n)));
    renderEdges();
    inspector.innerHTML=inspectorHtml();
    wireNodes();
    ensureResizeHandles();
    root.querySelectorAll(".pln-resize").forEach(h=>h.addEventListener("pointerdown",e=>startResize(e,h.dataset.resizeNode)));
    const prompt=buildPrompt();
    root.querySelector(".pln-status").textContent=state.nodes.length+" nodes · "+state.edges.length+" connections · "+prompt.text.split(/\s+/).filter(Boolean).length+" words"+(prompt.warnings.length?" · "+prompt.warnings.length+" warning(s)":"");
    root.querySelector(".pln-zoom-label").textContent=Math.round(state.view.z*100)+"%";
  }
  function inspectorHtml(){
    if(state.selected.length===1&&state.selected[0].startsWith("edge:")){
      const id=state.selected[0].slice(5),e=state.edges.find(x=>String(x.id)===id);if(!e)return "";
      const source=state.nodes.find(n=>n.id===e.source),target=state.nodes.find(n=>n.id===e.target);
      return `<div class="pln-inspector-body"><div class="pln-inspector-section"><div class="pln-inspector-label">Connection</div><strong>${esc(source?.label||"Source")} → ${esc(target?.label||"Target")}</strong><div class="pln-connection-meta">${esc(e.source_port||"right")} → ${esc(e.target_port||"left")}</div></div><div class="pln-inspector-section"><label class="pln-inspector-label" for="plnRelation">Relationship</label><select id="plnRelation">${["sequence","branch","context","constraint","reference","convergence"].map(v=>`<option value="${v}" ${e.relation===v?"selected":""}>${v}</option>`).join("")}</select></div><button class="pln-danger-btn" id="plnDeleteEdge">Delete connection</button></div>`;
    }
    if(state.selected.length!==1)return `<div class="pln-empty"><div><strong>Graph inspector</strong>Select a component to edit its role, text and relationships.</div></div>`;
    const n=state.nodes.find(x=>x.id===state.selected[0]);if(!n)return "";
    const definition=n.definition||{},settings=definition.settings||[];
    const settingFields=settings.length?'<div class="pln-inspector-section"><div class="pln-inspector-label">Block settings</div>'+settings.map(setting=>{const value=n.config?.[setting.id]??setting.default??"";if(setting.type==="select")return '<label class="pln-setting-label">'+esc(setting.name)+'</label><select data-node-setting="'+esc(setting.id)+'">'+(setting.options||[]).map(option=>'<option value="'+esc(option)+'" '+(String(value)===String(option)?"selected":"")+'>'+esc(option)+'</option>').join("")+'</select>';if(setting.type==="checkbox")return '<label class="pln-setting-check"><input type="checkbox" data-node-setting="'+esc(setting.id)+'" '+(value?"checked":"")+'> '+esc(setting.name)+'</label>';if(setting.type==="textarea")return '<label class="pln-setting-label">'+esc(setting.name)+'</label><textarea data-node-setting="'+esc(setting.id)+'">'+esc(value)+'</textarea>';return '<label class="pln-setting-label">'+esc(setting.name)+'</label><input type="'+(setting.type==="number"?"number":"text")+'" data-node-setting="'+esc(setting.id)+'" value="'+esc(value)+'">';}).join("")+'</div>':'';
    const contracts=definition.schema?'<div class="pln-inspector-section"><div class="pln-inspector-label">Port contract</div><div class="pln-connection-meta">Inputs: '+(definition.inputs||[]).length+' · Outputs: '+(definition.outputs||[]).length+'</div></div>':'';
    return '<div class="pln-inspector-body"><div class="pln-inspector-section"><div class="pln-inspector-label">Component</div><input id="plnTitle" value="'+esc(n.label)+'"><div style="height:8px"></div><textarea id="plnText">'+esc(n.text)+'</textarea></div>'+settingFields+contracts+'<div class="pln-inspector-section"><div class="pln-inspector-label">Connections</div><div style="font-size:11px;color:var(--ink-3)">Incoming: '+state.edges.filter(e=>e.target===n.id).length+'<br>Outgoing: '+state.edges.filter(e=>e.source===n.id).length+'<br><br>Connect an output port to an input port. Legacy components retain their standard handles.</div></div><div class="pln-inspector-section"><div class="pln-inspector-label">Generated prompt</div><div class="pln-preview">'+esc(buildPrompt().text)+'</div></div><div class="pln-auth-actions"><button class="pln-tool" id="plnDeleteSelected">Delete component</button></div></div>';
  }
  function ensureResizeHandles(){
    root.querySelectorAll(".pln-node").forEach(node=>{
      if(!node.querySelector(".pln-resize")){const h=document.createElement("span");h.className="pln-resize";h.dataset.resizeNode=node.dataset.node;h.title="Resize";node.appendChild(h);}
    });
  }

  function startResize(e,id){
    e.stopPropagation();e.preventDefault();
    const n=state.nodes.find(x=>x.id===id);if(!n)return;
    snapshot();
    const move=ev=>{const p=screenToWorld(ev.clientX,ev.clientY);n.width=Math.max(180,Math.min(720,snap(p.x-n.x)));n.height=Math.max(96,Math.min(720,snap(p.y-n.y)));render();};
    const end=()=>{window.removeEventListener("pointermove",move);markDirty();};
    window.addEventListener("pointermove",move);window.addEventListener("pointerup",end,{once:true});
  }

  function startMarquee(e){
    const start=screenToWorld(e.clientX,e.clientY);marquee={start,current:start,add:e.shiftKey};
    const move=ev=>{marquee.current=screenToWorld(ev.clientX,ev.clientY);renderMarquee();};
    const end=()=>{
      if(!marquee)return;
      const a=marquee.start,b=marquee.current,x1=Math.min(a.x,b.x),x2=Math.max(a.x,b.x),y1=Math.min(a.y,b.y),y2=Math.max(a.y,b.y);
      const ids=state.nodes.filter(n=>n.x<x2&&n.x+n.width>x1&&n.y<y2&&n.y+n.height>y1).map(n=>n.id);
      state.selected=marquee.add?[...new Set([...state.selected,...ids])]:ids;
      root.querySelector(".pln-marquee")?.remove();marquee=null;window.removeEventListener("pointermove",move);render();
    };
    window.addEventListener("pointermove",move);window.addEventListener("pointerup",end,{once:true});
  }

  function renderMarquee(){
    if(!marquee)return;
    const a=marquee.start,b=marquee.current,x=Math.min(a.x,b.x),y=Math.min(a.y,b.y),w=Math.abs(a.x-b.x),h=Math.abs(a.y-b.y);
    const el=root.querySelector(".pln-marquee")||document.createElement("div");el.className="pln-marquee";
    el.style.left=(state.view.x+x*state.view.z)+"px";el.style.top=(state.view.y+y*state.view.z)+"px";
    el.style.width=(w*state.view.z)+"px";el.style.height=(h*state.view.z)+"px";
    if(!el.parentNode)canvas.appendChild(el);
  }

  function alignSelection(axis){
    const nodes=state.nodes.filter(n=>state.selected.includes(n.id));if(nodes.length<2)return;
    snapshot();const value=nodes[0][axis];nodes.forEach(n=>n[axis]=snap(value));markDirty();render();
  }

  function distributeSelection(axis){
    const nodes=state.nodes.filter(n=>state.selected.includes(n.id));if(nodes.length<3)return;
    snapshot();nodes.sort((a,b)=>a[axis]-b[axis]);const min=nodes[0][axis],max=nodes[nodes.length-1][axis],step=(max-min)/(nodes.length-1);nodes.forEach((n,i)=>n[axis]=snap(min+step*i));markDirty();render();
  }
  function wireNodes(){
    root.querySelectorAll("[data-drag-node]").forEach(el=>el.addEventListener("pointerdown",e=>{
      if(e.button!==0||e.target.closest("button,textarea"))return;
      const id=el.dataset.dragNode,n=state.nodes.find(x=>x.id===id);if(!n)return;
      if(!e.shiftKey&&!state.selected.includes(id)){state.selected=[id];render();}
      else if(e.shiftKey){state.selected=state.selected.includes(id)?state.selected.filter(x=>x!==id):[...state.selected,id];render();}
      const movingIds=new Set(state.selected);
      state.groups.forEach(g=>{if(g.nodes.includes(id))g.nodes.forEach(x=>movingIds.add(x));});
      const start=screenToWorld(e.clientX,e.clientY), originals=new Map([...movingIds].map(s=>{const x=state.nodes.find(n=>n.id===s);return [s,{x:x.x,y:x.y}]}));snapshot();
      drag={id,start,originals};el.setPointerCapture?.(e.pointerId);
      window.addEventListener("pointermove",moveNode);window.addEventListener("pointerup",endNode,{once:true});
    }));
    root.querySelectorAll("[data-delete-node]").forEach(b=>b.onclick=e=>{e.stopPropagation();deleteNodes([b.dataset.deleteNode])});
    root.querySelectorAll("[data-edit-node]").forEach(t=>t.addEventListener("input",()=>{const n=state.nodes.find(x=>x.id===t.dataset.editNode);if(n){n.text=t.value;markDirty(false);updateInspectorPreview()}}));
    root.querySelectorAll("[data-node-setting]").forEach(field=>{const update=()=>{const n=state.nodes.find(x=>x.id===state.selected[0]);if(!n)return;n.config=n.config||{};n.config[field.dataset.nodeSetting]=field.type==="checkbox"?field.checked:field.value;markDirty();updateInspectorPreview();};field.addEventListener(field.type==="checkbox"||field.tagName==="SELECT"?"change":"input",update);});
    root.querySelectorAll(".pln-handle").forEach(h=>h.addEventListener("pointerdown",e=>startConnect(e,h.dataset.node,h.dataset.side)));
    root.querySelectorAll(".pln-edge").forEach(p=>p.addEventListener("pointerdown",e=>{e.stopPropagation();state.selected=e.shiftKey?[...new Set([...state.selected,"edge:"+p.dataset.edge])]:["edge:"+p.dataset.edge];render();}));    root.querySelectorAll(".pln-edge-endpoint").forEach(p=>p.addEventListener("pointerdown",e=>startEdgeReconnect(e,p.dataset.edge,p.dataset.edgeEnd)));
    const title=inspector.querySelector("#plnTitle");if(title)title.oninput=()=>{const n=state.nodes.find(x=>x.id===state.selected[0]);if(n){n.label=title.value;markDirty(false);render()}};const text=inspector.querySelector("#plnText");if(text)text.oninput=()=>{const n=state.nodes.find(x=>x.id===state.selected[0]);if(n){n.text=text.value;markDirty(false);render()}};const del=inspector.querySelector("#plnDeleteSelected");if(del)del.onclick=()=>deleteNodes([...state.selected]);
  }
  function updateInspectorPreview(){const p=inspector.querySelector(".pln-preview");if(p)p.textContent=buildPrompt().text;}
  function moveNode(e){if(!drag)return;const p=screenToWorld(e.clientX,e.clientY),dx=p.x-drag.start.x,dy=p.y-drag.start.y;drag.originals.forEach((o,id)=>{const n=state.nodes.find(x=>x.id===id);if(n){n.x=o.x+dx;n.y=o.y+dy}});render();}
  function endNode(){if(!drag)return;drag=null;window.removeEventListener("pointermove",moveNode);root.classList.remove("pln-dragging");markDirty();}
  function deleteNodes(ids){if(!ids.length)return;snapshot();const set=new Set(ids);state.nodes=state.nodes.filter(n=>!set.has(n.id));state.edges=state.edges.filter(e=>!set.has(e.source)&&!set.has(e.target));state.groups=state.groups.map(g=>({...g,nodes:g.nodes.filter(id=>!set.has(id))})).filter(g=>g.nodes.length>=2);state.selected=[];markDirty();render();}
  function startConnect(e,id,side){
    e.stopPropagation();e.preventDefault();
    const node=state.nodes.find(n=>n.id===id);if(!node)return;
    if(side.startsWith("in:")){toast("Start a connection from an output port.");return;}
    connect={source:id,side,preview:{start:point(node,side),end:point(node,side)}};
    root.classList.add("pln-connecting");
    window.addEventListener("pointermove",moveConnect);
    window.addEventListener("pointerup",finishConnect,{once:true});
  }

  function moveConnect(e){
    if(!connect)return;
    connect.preview.end=screenToWorld(e.clientX,e.clientY);
    root.querySelectorAll(".pln-handle.hot").forEach(h=>h.classList.remove("hot"));
    const target=e.target.closest?.(".pln-handle");if(target)target.classList.add("hot");
    renderEdges();
  }

  function finishConnect(e){
    if(!connect)return;
    const target=e.target.closest?.(".pln-handle");
    root.querySelectorAll(".pln-handle.hot").forEach(h=>h.classList.remove("hot"));
    root.classList.remove("pln-connecting");
    if(target){
      const source=state.nodes.find(n=>n.id===connect.source),dest=state.nodes.find(n=>n.id===target.dataset.node),sourcePort=connect.side,targetPort=target.dataset.side;
      const customPair=sourcePort.startsWith("out:")&&targetPort.startsWith("in:");
      const legacyPair=!sourcePort.includes(":")&&!targetPort.includes(":");
      if(source&&dest&&relationAllowed(source,dest)&&(customPair||legacyPair)){
        snapshot();
        const edge={id:uid("e"),source:source.id,target:dest.id,source_port:sourcePort,target_port:targetPort,relation:"sequence"};
        state.edges.push(edge);state.selected=["edge:"+edge.id];markDirty();
      }else if(source&&dest){toast(source.id===dest.id?"A component cannot connect to itself.":(!customPair&&!legacyPair?"Connect an output port to an input port.":"That connection would create a cycle."));}
    }
    connect=null;
    window.removeEventListener("pointermove",moveConnect);
    render();
  }
  function startEdgeReconnect(e,id,side){
    e.stopPropagation();e.preventDefault();
    const edge=state.edges.find(x=>String(x.id)===String(id));if(!edge)return;
    const nodeId=side==="source"?edge.source:edge.target,port=side==="source"?(edge.source_port||"right"):(edge.target_port||"left"),node=state.nodes.find(n=>n.id===nodeId);
    if(!node)return;
    connect={mode:"reconnect",edgeId:String(id),end:side,side:port,preview:{start:point(node,port),end:point(node,port)}};
    root.classList.add("pln-connecting");
    window.addEventListener("pointermove",moveConnect);window.addEventListener("pointerup",finishReconnect,{once:true});
  }

  function finishReconnect(e){
    if(!connect)return;
    const target=e.target.closest?.(".pln-handle");root.classList.remove("pln-connecting");
    if(target){
      const edge=state.edges.find(x=>String(x.id)===String(connect.edgeId));
      const destId=target.dataset.node,destSide=target.dataset.side;
      const sourcePort=connect.end==="source"?destSide:edge?.source_port,targetPort=connect.end==="target"?destSide:edge?.target_port;
      const customPair=String(sourcePort||"").startsWith("out:")&&String(targetPort||"").startsWith("in:");
      const legacyPair=!String(sourcePort||"").includes(":")&&!String(targetPort||"").includes(":");
      if(edge&&destId!==edge.source&&destId!==edge.target&&(customPair||legacyPair)){
        if(connect.end==="source"){if(!wouldCycle(destId,edge.target)){edge.source=destId;edge.source_port=destSide;markDirty();}else toast("That reconnection would create a cycle.");}
        else if(!wouldCycle(edge.source,destId)){edge.target=destId;edge.target_port=destSide;markDirty();}else toast("That reconnection would create a cycle.");
      }else if(edge&&!(customPair||legacyPair)){toast("Connect an output port to an input port.");}
    }
    connect=null;window.removeEventListener("pointermove",moveConnect);render();
  }
  function saveDebounced(){clearTimeout(saveTimer);saveTimer=setTimeout(save,500);}
  async function save(){
    if(!state.compositionId)return;
    const node_meta={};state.nodes.forEach(n=>{if(n.definition?.schema)node_meta[n.id]={definition:n.definition,config:n.config||{}};});
    const payload={nodes:state.nodes.map(n=>({id:n.id,block_ref:n.block_ref,x:n.x,y:n.y,z_index:n.z_index,collapsed:n.collapsed,body_override:n.text})),edges:state.edges,view_state:{...state.view,groups:state.groups,node_meta}};
    const r=await api("/api/compositions/"+state.compositionId+"/graph",{method:"PUT",body:JSON.stringify(payload)}).catch(()=>null);
    if(r?.ok)state.dirty=false;
  }
  function markDirty(auto=true){state.dirty=true;if(auto)saveDebounced();}
  async function load(){
    let r=await api("/api/compositions/graph",{method:"POST",body:JSON.stringify({title:"Prompt Graph"})});
    if(!r.ok)return;const d=await r.json();state.compositionId=d.id;try{localStorage.setItem("promptlib.nodeCanvasComposition",String(d.id));}catch(_){ }await save();
  }
  async function loadCustomBlocks(){
    try{const response=await api("/api/components");if(!response.ok)return;const rows=await response.json();state.customBlocks=(Array.isArray(rows)?rows:[]).map(row=>({id:"user:"+row.id,dbId:row.id,label:row.name,name:row.name,text:row.body||"",body:row.body||"",description:row.description||"",definition:row.definition||{},source:"user",cat:row.category||"My blocks",icon:row.definition?.icon||"extension"}));}catch(error){console.warn("Custom block library could not be loaded.",error);}
  }
  async function openExisting(){
    const r=await api("/api/compositions");if(!r.ok)return;const list=await r.json();let preferred=null;try{preferred=localStorage.getItem("promptlib.nodeCanvasComposition");}catch(_){ }const c=(preferred&&list.find(x=>String(x.id)===String(preferred)))||list?.[0];if(!c)return;
    state.compositionId=c.id;try{localStorage.setItem("promptlib.nodeCanvasComposition",String(c.id));}catch(_){ }const g=await api("/api/compositions/"+c.id+"/graph").then(x=>x.json()).catch(()=>null);if(!g)return;
    let saved={};try{saved=JSON.parse(g.composition.view_state||"{}")||{};}catch(_){}
    const nodeMeta=saved.node_meta||{},ref=new Map(blocks().map(b=>[String(b.id||b.label),b]));
    state.nodes=(g.nodes||[]).map(row=>{const b=ref.get(String(row.block_ref)),meta=nodeMeta[String(row.id)]||{},definition=meta.definition||b?.definition||{};const config=meta.config||defaultConfig(definition);const ports=Math.max((definition.inputs||[]).length,(definition.outputs||[]).length);return {id:String(row.id),block_ref:row.block_ref,label:b?.label||row.block_ref,text:row.body_override??b?.text??"",definition,config,x:+row.x||0,y:+row.y||0,z_index:+row.z_index||0,collapsed:!!row.collapsed,width:definition.schema?320:260,height:definition.schema?Math.max(170,142+ports*24):140};});
    state.edges=(g.edges||[]).map(e=>({id:String(e.id),source:String(e.source_block_id),target:String(e.target_block_id),source_port:e.source_port,target_port:e.target_port,relation:e.relation}));
    state.view={x:+saved.x||80,y:+saved.y||60,z:+saved.z||+saved.zoom||1};state.groups=Array.isArray(saved.groups)?saved.groups:[];
    render();
  }
  function shell(){
    root=document.createElement("div");root.className="pln-shell";root.innerHTML=`
      <aside class="pln-palette"><div class="pln-panel-head"><span>Block library</span><button class="pln-tool" id="plnNew" title="New graph">＋</button></div><button class="pln-create-block" id="plnCreateBlock" type="button">＋ Create custom block</button><input class="pln-search" placeholder="Search components"><div class="pln-palette-list"></div></aside>
      <main class="pln-canvas" tabindex="0"><div class="pln-toolbar"><button class="pln-tool" id="plnUndo">Undo</button><button class="pln-tool" id="plnRedo">Redo</button><span class="pln-divider"></span><button class="pln-tool" id="plnDuplicate">Duplicate</button><button class="pln-tool" id="plnGroup">Group</button><button class="pln-tool" id="plnAlignX">Align X</button><button class="pln-tool" id="plnAlignY">Align Y</button><button class="pln-tool" id="plnDelete">Delete</button><span class="pln-divider"></span><button class="pln-tool" id="plnFit">Fit</button></div><svg class="pln-svg" aria-hidden="true"></svg><div class="pln-world"></div><div class="pln-status">0 nodes</div><div class="pln-zoom"><button class="pln-tool" id="plnZoomOut">−</button><span class="pln-zoom-label">100%</span><button class="pln-tool" id="plnZoomIn">+</button></div><div class="pln-toast" hidden></div></main>
      <aside class="pln-inspector"><div class="pln-panel-head"><span>Graph inspector</span><button class="pln-tool" id="plnSave">Save</button></div></aside>`;
    return root;
  }
  function fit(){if(!state.nodes.length)return;const minX=Math.min(...state.nodes.map(n=>n.x)),minY=Math.min(...state.nodes.map(n=>n.y)),maxX=Math.max(...state.nodes.map(n=>n.x+n.width)),maxY=Math.max(...state.nodes.map(n=>n.y+n.height));const z=Math.max(.35,Math.min(1.2,Math.min((canvas.clientWidth-80)/(maxX-minX+80),(canvas.clientHeight-80)/(maxY-minY+80))));state.view.z=z;state.view.x=(canvas.clientWidth-(maxX-minX)*z)/2-minX*z;state.view.y=(canvas.clientHeight-(maxY-minY)*z)/2-minY*z;render();}
  function wireShell(){
    canvas=root.querySelector(".pln-canvas");world=root.querySelector(".pln-world");svg=root.querySelector(".pln-svg");palette=root.querySelector(".pln-palette");inspector=root.querySelector(".pln-inspector");
    palette.querySelector(".pln-search").oninput=renderPalette;
    root.querySelector("#plnUndo").onclick=undo;root.querySelector("#plnRedo").onclick=redo;root.querySelector("#plnDelete").onclick=()=>{const edges=state.selected.filter(x=>x.startsWith("edge:")).map(x=>x.slice(5));const nodes=state.selected.filter(x=>!x.startsWith("edge:"));if(edges.length)deleteEdges(edges);if(nodes.length)deleteNodes(nodes);};root.querySelector("#plnDuplicate").onclick=()=>{if(!state.selected.length)return;snapshot();const chosen=state.nodes.filter(n=>state.selected.includes(n.id));const ids=new Map(chosen.map(n=>[n.id,uid("n")]));const copies=chosen.map(n=>({...clone(n),id:ids.get(n.id),x:n.x+28,y:n.y+28}));state.nodes.push(...copies);state.edges.push(...state.edges.filter(e=>ids.has(e.source)&&ids.has(e.target)).map(e=>({...clone(e),id:uid("e"),source:ids.get(e.source),target:ids.get(e.target)})));state.selected=copies.map(n=>n.id);markDirty();render();};
    root.querySelector("#plnGroup").onclick=()=>{const ids=state.selected.filter(x=>!x.startsWith("edge:"));if(ids.length<2)return;snapshot();state.groups.push({id:uid("g"),nodes:[...ids],label:"Prompt group"});markDirty();render();};root.querySelector("#plnAlignX").onclick=()=>alignSelection("x");root.querySelector("#plnAlignY").onclick=()=>alignSelection("y");
    root.querySelector("#plnNew").onclick=()=>{snapshot();state.nodes=[];state.edges=[];state.selected=[];state.view={x:80,y:60,z:1};state.compositionId=null;load().then(render);};
    root.querySelector("#plnCreateBlock").onclick=()=>openBlockStudio();
    root.querySelector("#plnFit").onclick=fit;root.querySelector("#plnSave").onclick=save;root.querySelector("#plnZoomIn").onclick=()=>zoomAt(1.15,canvas.clientWidth/2,canvas.clientHeight/2);root.querySelector("#plnZoomOut").onclick=()=>zoomAt(.87,canvas.clientWidth/2,canvas.clientHeight/2);
    canvas.addEventListener("wheel",e=>{e.preventDefault();zoomAt(e.deltaY<0?1.1:.9,e.clientX-canvas.getBoundingClientRect().left,e.clientY-canvas.getBoundingClientRect().top)},{passive:false});
    canvas.addEventListener("pointerdown",e=>{if(e.target!==canvas&&e.target!==world)return;if(e.button===1||e.button===2||root.classList.contains("pln-space")){pan={x:e.clientX,y:e.clientY,vx:state.view.x,vy:state.view.y};canvas.setPointerCapture(e.pointerId);return;}if(e.button===0)startMarquee(e);});
    canvas.addEventListener("contextmenu",e=>e.preventDefault());
    canvas.addEventListener("dragover",e=>e.preventDefault());canvas.addEventListener("drop",e=>{e.preventDefault();const ref=e.dataTransfer.getData("text/pln-block");if(ref)addBlockByRef(ref,e.clientX,e.clientY)});
    canvas.addEventListener("pointermove",e=>{if(pan){state.view.x=pan.vx+(e.clientX-pan.x);state.view.y=pan.vy+(e.clientY-pan.y);applyView();renderEdges();}});
    canvas.addEventListener("pointerup",()=>{pan=null});
    document.addEventListener("keydown",e=>{if(!root.isConnected)return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="z"){e.preventDefault();e.shiftKey?redo():undo();}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="y"){e.preventDefault();redo();}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="d"){e.preventDefault();root.querySelector("#plnDuplicate").click();}else if(e.key==="Delete"||e.key==="Backspace"){if(!e.target.matches("input,textarea")){e.preventDefault();root.querySelector("#plnDelete").click();}}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="a"){if(!e.target.matches("input,textarea")){e.preventDefault();state.selected=state.nodes.map(n=>n.id);render();}}else if(e.key==="Escape"){connect=null;state.selected=[];render();}else if(e.code==="Space"&&!e.target.matches("input,textarea")){e.preventDefault();root.classList.add("pln-space");}});
    document.addEventListener("keyup",e=>{if(e.code==="Space")root.classList.remove("pln-space");});
    renderPalette();
  }
  function zoomAt(factor,sx,sy){const before={x:(sx-state.view.x)/state.view.z,y:(sy-state.view.y)/state.view.z};state.view.z=Math.max(.25,Math.min(2.4,state.view.z*factor));state.view.x=sx-before.x*state.view.z;state.view.y=sy-before.y*state.view.z;applyView();renderEdges();root.querySelector(".pln-zoom-label").textContent=Math.round(state.view.z*100)+"%";markDirty();}
  async function init(){
    const host=document.getElementById("componentsWorkspace");if(!host||host.dataset.plnReady)return;host.dataset.plnReady="1";
    const old=host.querySelector(".pcw-body");if(old)old.style.display="none";
    state=blank();root=shell();host.appendChild(root);wireShell();await loadCustomBlocks();await openExisting();render();
  }
  function maybe(){const host=document.getElementById("componentsWorkspace");if(host&&host.offsetParent!==null&&!host.dataset.plnReady)init();}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(maybe,700));else setTimeout(maybe,700);
  document.addEventListener("click",e=>{if(e.target.closest('[data-view="components"]'))setTimeout(init,250);});
  window.PL_NodeCanvas={init};
})();