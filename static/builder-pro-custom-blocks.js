(function(){
"use strict";
const PB=window.PLBuilder;
if(!PB||window.PLPromptBuilderCustomBlocks)return;
window.PLPromptBuilderCustomBlocks=true;
const PE=PB.engine,BLOCKS=PE.BLOCKS,LIBRARY=PE.LIBRARY,CATEGORIES=PE.CATEGORIES;
const STORE="prompt-builder-pro.custom-blocks.v1",PREFIX="user_block_";
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const key=s=>String(s||"").toLowerCase().trim().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"").slice(0,32)||"port";
const toast=(m,k)=>window.PL_toast&&window.PL_toast(m,k||"info");
let defs=[];
function register(d){
 if(!d||!d.type||!Array.isArray(d.inputs)||!Array.isArray(d.outputs)||!Array.isArray(d.fields))return;
 const b={type:d.type,label:d.label,hint:d.hint||"Your custom block",about:d.about||"",category:d.category==="agents"?"agents":"custom",kind:d.category==="agents"?"worker":"custom",glyph:"widgets",section:d.category==="agents"?"agents":"instructions",inputs:d.inputs.length?d.inputs:false,outputs:d.outputs.length?d.outputs:[{id:"out",label:"Next"}],fields:d.fields,defaults:d.defaults||{title:d.label,content:""},customBlock:true,settings:d.settings||[]};
 BLOCKS[d.type]=b;const i=LIBRARY.findIndex(x=>x.type===d.type);if(i<0)LIBRARY.push(b);else LIBRARY[i]=b;
 if(!CATEGORIES.some(x=>x.id==="custom"))CATEGORIES.push({id:"custom",label:"My blocks"});
 const old=defs.findIndex(x=>x.type===d.type);if(old<0)defs.push(d);else defs[old]=d;
}
try{const stored=JSON.parse(localStorage.getItem(STORE)||"[]");if(Array.isArray(stored))stored.forEach(register);}catch(e){}
const originalCompile=PE.compilePrompt;
PE.compilePrompt=function(nodes,edges,opts){
 const prepared=(nodes||[]).map(n=>{
  const d=BLOCKS[n.type];if(!d||!d.customBlock)return n;
  let content=String(n.config&&n.config.content||"");
  (d.inputs||[]).forEach(p=>{content=content.split("{{input:"+p.id+"}}").join("[Connected input: "+p.label+"]");});
  (d.outputs||[]).forEach(p=>{content=content.split("{{output:"+p.id+"}}").join("[Produce output: "+p.label+"]");});
  (d.settings||[]).forEach(p=>{content=content.split("{{setting:"+p.id+"}}").join(String(n.config["setting_"+p.id]??p.defaultValue??""));});
  return Object.assign({},n,{config:Object.assign({},n.config,{content})});
 });
 return originalCompile(prepared,edges,opts);
};
function addRow(kind,data){
 const id=kind==="setting"?"pbp-cb-settings":"pbp-cb-"+kind+"s",root=document.getElementById(id);if(!root)return;
 const row=document.createElement("div");row.className="pbp-cb-row";row.dataset.kind=kind;
 const k=data&&data.id||"",label=data&&data.label||"";
 if(kind==="setting"){
  row.innerHTML='<input class="form-input" data-key aria-label="Setting key" placeholder="setting_key" value="'+esc(k)+'"><input class="form-input" data-label aria-label="Setting label" placeholder="Setting name" value="'+esc(label)+'"><select class="form-input" data-type><option value="text">Text</option><option value="textarea">Long text</option><option value="number">Number</option><option value="select">Dropdown</option></select><input class="form-input" data-default aria-label="Default value" placeholder="Default value" value="'+esc(data&&data.defaultValue||"")+'"><button type="button" data-remove aria-label="Remove">×</button>';
  row.querySelector("[data-type]").value=data&&data.type||"text";
 }else row.innerHTML='<input class="form-input" data-key aria-label="Port key" placeholder="'+kind+'_key" value="'+esc(k)+'"><input class="form-input" data-label aria-label="Port label" placeholder="'+(kind==="input"?"Input name":"Output name")+'" value="'+esc(label)+'"><button type="button" data-remove aria-label="Remove">×</button>';
 root.appendChild(row);
}
function dialog(){
 let d=document.getElementById("pbp-custom-block-dialog");if(d)return d;
 d=document.createElement("dialog");d.id="pbp-custom-block-dialog";d.className="pbp-custom-dialog";
 d.innerHTML='<form method="dialog"><header><div><small> PROMPT BUILDER / MY BLOCKS</small><h2 id="pbp-cb-title">Create a custom block</h2><p>Design its connections, settings and prompt instructions.</p></div><button type="button" data-close>×</button></header><main><label>Block name<input class="form-input" id="pbp-cb-name" maxlength="60" required></label><label>Description<input class="form-input" id="pbp-cb-hint" maxlength="120"></label><label>Block type<select class="form-input" id="pbp-cb-category"><option value="custom">Standard block</option><option value="agents">Agent block</option></select></label><section><div><b>Inputs</b><button type="button" data-add="input">+ Add input</button></div><div id="pbp-cb-inputs"></div></section><section><div><b>Outputs</b><button type="button" data-add="output">+ Add output</button></div><div id="pbp-cb-outputs"></div></section><section><div><b>Settings</b><button type="button" data-add="setting">+ Add setting</button></div><div id="pbp-cb-settings"></div></section><label>Prompt instructions<textarea class="form-textarea" id="pbp-cb-body" rows="8" placeholder="Write the instructions this block contributes to the compiled prompt."></textarea></label><aside><b>Template tokens</b><code>{{input:brief}}</code><code>{{setting:mode}}</code><code>{{output:result}}</code><small>Use these to reference the named connections and settings in your prompt template.</small></aside></main><footer><button type="button" data-close>Cancel</button><button type="button" class="btn btn-accent" id="pbp-cb-save">Save block</button></footer></form>';
 document.body.appendChild(d);
 d.addEventListener("click",e=>{if(e.target===d||e.target.closest("[data-close]")){d.close();return;}const add=e.target.closest("[data-add]");if(add){addRow(add.dataset.add);return;}const rem=e.target.closest("[data-remove]");if(rem)rem.closest(".pbp-cb-row").remove();});
 d.querySelector("#pbp-cb-save").addEventListener("click",save);
 return d;
}
let editing=null;
function open(type){
 const d=dialog(),def=defs.find(x=>x.type===type);
 editing=def?type:null;
 d.querySelector("#pbp-cb-title").textContent=def?"Edit custom block":"Create a custom block";
 d.querySelector("#pbp-cb-name").value=def&&def.label||"";
 d.querySelector("#pbp-cb-hint").value=def&&def.hint||"";
 d.querySelector("#pbp-cb-category").value=def&&def.category||"custom";
 d.querySelector("#pbp-cb-body").value=def&&def.template||"";
 ["inputs","outputs","settings"].forEach(x=>d.querySelector("#pbp-cb-"+x).innerHTML="");
 (def&&def.inputs||[{id:"in",label:"Input"}]).forEach(x=>addRow("input",x));
 (def&&def.outputs||[{id:"out",label:"Output"}]).forEach(x=>addRow("output",x));
 (def&&def.settings||[]).forEach(x=>addRow("setting",x));
 d.showModal();
}
function rows(kind){
 const id=kind==="setting"?"settings":kind+"s";
 return Array.from(document.querySelectorAll("#pbp-cb-"+id+" .pbp-cb-row")).map(r=>({
  id:key(r.querySelector("[data-key]").value||r.querySelector("[data-label]").value),
  label:r.querySelector("[data-label]").value.trim(),
  ...(kind==="setting"?{type:r.querySelector("[data-type]").value,defaultValue:r.querySelector("[data-default]").value}:{})
 })).filter(x=>x.label);
}
function save(){
 const d=dialog(),label=d.querySelector("#pbp-cb-name").value.trim(),hint=d.querySelector("#pbp-cb-hint").value.trim(),category=d.querySelector("#pbp-cb-category").value;
 const inputs=rows("input"),outputs=rows("output"),settings=rows("setting");
 if(!label)return toast("Give your block a name.","warning");
 if(!outputs.length)return toast("Add at least one output so this block can connect to the builder.","warning");
 for(const group of [inputs,outputs,settings])if(new Set(group.map(x=>x.id)).size!==group.length)return toast("Keys must be unique within each section.","warning");
 const type=editing||PREFIX+key(label)+"_"+Date.now().toString(36),template=d.querySelector("#pbp-cb-body").value;
 const fields=[{key:"content",label:"Prompt instructions",type:"textarea",rows:8}];
 const defaults={title:label,content:template};
 settings.forEach(s=>{fields.push({key:"setting_"+s.id,label:s.label,type:s.type==="select"?"text":s.type,rows:3});defaults["setting_"+s.id]=s.defaultValue||"";});
 register({type,label,hint,category,inputs,outputs,settings,template,fields,defaults});
 try{localStorage.setItem(STORE,JSON.stringify(defs));}catch(e){toast("Could not persist the custom block. Storage may be full.","error");}
 d.close();renderLibrary();toast(editing?"Block definition updated.":"Custom block saved to My blocks.","success");editing=null;
}
function renderLibrary(){
 const root=document.getElementById("builderProWorkspace"),lib=root&&root.querySelector("#pbp-library");if(!lib)return;
 lib.querySelectorAll('[data-add^="'+PREFIX+'"]').forEach(btn=>{
  if(btn.parentElement.classList.contains("pbp-cb-item"))return;
  const type=btn.dataset.add,wrap=document.createElement("div");wrap.className="pbp-cb-item";
  btn.parentNode.insertBefore(wrap,btn);wrap.appendChild(btn);
  const edit=document.createElement("button");edit.type="button";edit.className="pbp-cb-edit";edit.textContent="Edit";edit.dataset.editCustom=type;wrap.appendChild(edit);
 });
}
function mount(){
 const root=document.getElementById("builderProWorkspace");if(!root)return;
 const head=root.querySelector(".pbp-pane-left .pbp-pane-head .pbp-pane-head-row");if(head&&!head.querySelector("[data-create-custom]")){
  const b=document.createElement("button");b.type="button";b.className="btn pbp-btn-xs pbp-create-custom";b.dataset.createCustom="1";b.textContent="+ Create block";head.appendChild(b);b.onclick=()=>open(null);
 }
 const lib=root.querySelector("#pbp-library");if(lib&&!lib.dataset.customObserver){lib.dataset.customObserver="1";new MutationObserver(renderLibrary).observe(lib,{childList:true});renderLibrary();const search=root.querySelector("#pbp-block-search");if(search)search.dispatchEvent(new Event("input",{bubbles:true}));}
}
document.addEventListener("click",e=>{const edit=e.target.closest("[data-edit-custom]");if(edit){e.preventDefault();e.stopPropagation();open(edit.dataset.editCustom);}});
const watch=new MutationObserver(mount);watch.observe(document.body,{childList:true,subtree:true});mount();
})();