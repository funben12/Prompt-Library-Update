/* Prompt Components Node Canvas v1, vanilla implementation */
(function(){
  "use strict";
  const NS="pln";
  let root, canvas, world, svg, palette, inspector, state;
  let drag=null, pan=null, connect=null, marquee=null, history=[], future=[], saveTimer=null;
  const clone=o=>JSON.parse(JSON.stringify(o));
  const uid=p=>p+"_"+Math.random().toString(36).slice(2,10);
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const blocks=()=>[...(window._pcwBLOCKS||[]),...(window._pcwFRAMEWORKS||[]).map((f,i)=>({id:"framework:"+i,label:f.name||f.title||"Framework",text:f.template||f.prompt||f.description||"",icon:"schema",cat:"framework"}))];
  const blank=()=>({id:null,title:"",nodes:[],edges:[],view:{x:80,y:60,z:1},selected:[],groups:[],dirty:false,snap:true});
  function api(url,opt={}){return fetch(url,{credentials:"same-origin",headers:{"Content-Type":"application/json",...(opt.headers||{})},...opt});}
  function nodeDef(b,x,y){return {id:uid("n"),block_ref:String(b.id||b.label||uid("b")),label:b.label||b.name||"Component",text:b.text||b.body||"",x,y,z_index:0,collapsed:false,width:260,height:140};}
  function snapshot(){history.push(clone({nodes:state.nodes,edges:state.edges,view:state.view,groups:state.groups}));if(history.length>80)history.shift();future=[];}
  function undo(){if(!history.length)return;future.push(clone({nodes:state.nodes,edges:state.edges,view:state.view,groups:state.groups}));const s=history.pop();Object.assign(state,s);render();}
  function redo(){if(!future.length)return;history.push(clone({nodes:state.nodes,edges:state.edges,view:state.view,groups:state.groups}));const s=future.pop();Object.assign(state,s);render();}
  function screenToWorld(clientX,clientY){const r=canvas.getBoundingClientRect();return{x:(clientX-r.left-state.view.x)/state.view.z,y:(clientY-r.top-state.view.y)/state.view.z};}
  function applyView(){const transform="translate("+state.view.x+"px,"+state.view.y+"px) scale("+state.view.z+")";world.style.transform=transform;svg.style.transform=transform;svg.style.transformOrigin="0 0";svg.setAttribute("width",Math.max(canvas.clientWidth/state.view.z+2000,4000));svg.setAttribute("height",Math.max(canvas.clientHeight/state.view.z+2000,4000));}
  function pathFor(a,b){const dx=Math.max(40,Math.abs(b.x-a.x)*.5);return "M "+a.x+" "+a.y+" C "+(a.x+dx)+" "+a.y+", "+(b.x-dx)+" "+b.y+", "+b.x+" "+b.y;}
  function point(n,side){if(side==="left")return{x:n.x,y:n.y+n.height/2};if(side==="right")return{x:n.x+n.width,y:n.y+n.height/2};if(side==="top")return{x:n.x+n.width/2,y:n.y};return{x:n.x+n.width/2,y:n.y+n.height};}
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
      const text=(n.text||"").trim();if(text)result.push(pad+text);
      const children=(out.get(n.id)||[]).map(e=>({edge:e,node:map.get(e.target)})).filter(x=>x.node).sort((a,b)=>a.node.y-b.node.y||a.node.x-b.node.x);
      if(children.length>1){children.forEach((item,i)=>{result.push("");result.push(pad+"[Branch "+(i+1)+(item.node.label?": "+item.node.label:"")+"]");walk(item.node,depth+1);});}
      else if(children.length===1){walk(children[0].node,depth);}
      seen.add(n.id);active.delete(n.id);
    }
    roots.forEach((n,i)=>{if(i)result.push("");walk(n,0);});
    state.nodes.slice().sort((a,b)=>a.y-b.y||a.x-b.x).forEach(n=>{if(!seen.has(n.id)){result.push("");result.push("[Additional graph component]");walk(n,0);}});
    return {text:result.filter(Boolean).join("\n").trim(),warnings};
  }
  function renderPalette(){
    const list=palette.querySelector(".pln-palette-list"), q=palette.querySelector(".pln-search").value.toLowerCase();
    const arr=blocks().filter(b=>(b.label||b.name||"").toLowerCase().includes(q)||(b.text||b.body||"").toLowerCase().includes(q));
    const groups=new Map();arr.forEach(b=>{const k=b.cat||"components";if(!groups.has(k))groups.set(k,[]);groups.get(k).push(b)});
    list.innerHTML=[...groups.entries()].map(([cat,items])=>"<details class='pln-section' open><summary>"+esc(cat)+" <span>"+items.length+"</span></summary>"+items.slice(0,120).map((b,i)=>`<button class="pln-palette-item" draggable="true" data-b="${esc(b.id||b.label||i)}"><span class="pln-palette-icon">${esc((b.icon||"extension").slice(0,1).toUpperCase())}</span><span class="pln-palette-copy"><strong>${esc(b.label||b.name||"Component")}</strong><span>${esc((b.text||b.body||"").slice(0,80))}</span></span></button>`).join("")+"</details>").join("");
    list.querySelectorAll(".pln-palette-item").forEach(btn=>{
      btn.addEventListener("dblclick",()=>{const r=canvas.getBoundingClientRect();addBlockByRef(btn.dataset.b,r.left+r.width/2,r.top+r.height/2);});
      btn.addEventListener("dragstart",e=>e.dataTransfer.setData("text/pln-block",btn.dataset.b));
    });
  }
  function addBlockByRef(ref,x,y){
    const b=blocks().find(v=>String(v.id||v.label||"")===String(ref))||blocks().find(v=>String(v.label||"")===String(ref));if(!b)return;
    snapshot();const p=screenToWorld(x,y);state.nodes.push(nodeDef(b,p.x-120,p.y-55));state.selected=[state.nodes.at(-1).id];markDirty();render();
  }
  function nodeHtml(n){
    return `<div class="pln-node ${state.selected.includes(n.id)?"selected":""}" data-node="${esc(n.id)}" style="left:${n.x}px;top:${n.y}px;width:${n.width||260}px;height:${n.height||140}px;z-index:${n.z_index||0}">
      <span class="pln-handle left" data-side="left" data-node="${esc(n.id)}"></span><span class="pln-handle right" data-side="right" data-node="${esc(n.id)}"></span><span class="pln-handle top" data-side="top" data-node="${esc(n.id)}"></span><span class="pln-handle bottom" data-side="bottom" data-node="${esc(n.id)}"></span>
      <div class="pln-node-head" data-drag-node="${esc(n.id)}"><span class="pln-node-dot"></span><span class="pln-node-title">${esc(n.label)}</span><button class="pln-tool pln-node-menu" data-delete-node="${esc(n.id)}" title="Delete">×</button></div>
      <textarea class="pln-node-edit" data-edit-node="${esc(n.id)}">${esc(n.text)}</textarea>
    </div>`;
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
    return `<div class="pln-inspector-body"><div class="pln-inspector-section"><div class="pln-inspector-label">Component</div><input id="plnTitle" value="${esc(n.label)}"><div style="height:8px"></div><textarea id="plnText">${esc(n.text)}</textarea></div><div class="pln-inspector-section"><div class="pln-inspector-label">Connections</div><div style="font-size:11px;color:var(--ink-3)">Incoming: ${state.edges.filter(e=>e.target===n.id).length}<br>Outgoing: ${state.edges.filter(e=>e.source===n.id).length}<br><br>Connect from any handle to another node. Multiple outputs create branches, multiple inputs create convergence.</div></div><div class="pln-inspector-section"><div class="pln-inspector-label">Generated prompt</div><div class="pln-preview">${esc(buildPrompt().text)}</div></div><div class="pln-auth-actions"><button class="pln-tool" id="plnDeleteSelected">Delete component</button></div></div>`;
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
      drag={id,start,originals};el.setPointerCapture(e.pointerId);
      el.addEventListener("pointermove",moveNode);el.addEventListener("pointerup",endNode,{once:true});
    }));
    root.querySelectorAll("[data-delete-node]").forEach(b=>b.onclick=e=>{e.stopPropagation();deleteNodes([b.dataset.deleteNode])});
    root.querySelectorAll("[data-edit-node]").forEach(t=>t.addEventListener("input",()=>{const n=state.nodes.find(x=>x.id===t.dataset.editNode);if(n){n.text=t.value;markDirty(false);updateInspectorPreview()}}));
    root.querySelectorAll(".pln-handle").forEach(h=>h.addEventListener("pointerdown",e=>startConnect(e,h.dataset.node,h.dataset.side)));
    root.querySelectorAll(".pln-edge").forEach(p=>p.addEventListener("pointerdown",e=>{e.stopPropagation();state.selected=e.shiftKey?[...new Set([...state.selected,"edge:"+p.dataset.edge])]:["edge:"+p.dataset.edge];render();}));    root.querySelectorAll(".pln-edge-endpoint").forEach(p=>p.addEventListener("pointerdown",e=>startEdgeReconnect(e,p.dataset.edge,p.dataset.edgeEnd)));
    const title=inspector.querySelector("#plnTitle");if(title)title.oninput=()=>{const n=state.nodes.find(x=>x.id===state.selected[0]);if(n){n.label=title.value;markDirty(false);render()}};const text=inspector.querySelector("#plnText");if(text)text.oninput=()=>{const n=state.nodes.find(x=>x.id===state.selected[0]);if(n){n.text=text.value;markDirty(false);render()}};const del=inspector.querySelector("#plnDeleteSelected");if(del)del.onclick=()=>deleteNodes([...state.selected]);
  }
  function updateInspectorPreview(){const p=inspector.querySelector(".pln-preview");if(p)p.textContent=buildPrompt().text;}
  function moveNode(e){if(!drag)return;const p=screenToWorld(e.clientX,e.clientY),dx=p.x-drag.start.x,dy=p.y-drag.start.y;drag.originals.forEach((o,id)=>{const n=state.nodes.find(x=>x.id===id);if(n){n.x=o.x+dx;n.y=o.y+dy}});render();}
  function endNode(){drag=null;markDirty();}
  function deleteNodes(ids){if(!ids.length)return;snapshot();const set=new Set(ids);state.nodes=state.nodes.filter(n=>!set.has(n.id));state.edges=state.edges.filter(e=>!set.has(e.source)&&!set.has(e.target));state.groups=state.groups.map(g=>({...g,nodes:g.nodes.filter(id=>!set.has(id))})).filter(g=>g.nodes.length>=2);state.selected=[];markDirty();render();}
  function startConnect(e,id,side){
    e.stopPropagation();e.preventDefault();
    const node=state.nodes.find(n=>n.id===id);if(!node)return;
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
      const source=state.nodes.find(n=>n.id===connect.source),dest=state.nodes.find(n=>n.id===target.dataset.node);
      if(source&&dest&&relationAllowed(source,dest)){
        snapshot();
        const edge={id:uid("e"),source:source.id,target:dest.id,source_port:connect.side,target_port:target.dataset.side,relation:"sequence"};
        state.edges.push(edge);state.selected=["edge:"+edge.id];markDirty();
      }else if(source&&dest){toast(source.id===dest.id?"A component cannot connect to itself.":"That connection would create a cycle.");}
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
      if(edge&&destId!==edge.source&&destId!==edge.target){
        if(connect.end==="source"){if(!wouldCycle(destId,edge.target)){edge.source=destId;edge.source_port=destSide;markDirty();}else toast("That reconnection would create a cycle.");}
        else if(!wouldCycle(edge.source,destId)){edge.target=destId;edge.target_port=destSide;markDirty();}else toast("That reconnection would create a cycle.");
      }
    }
    connect=null;window.removeEventListener("pointermove",moveConnect);render();
  }
  function saveDebounced(){clearTimeout(saveTimer);saveTimer=setTimeout(save,500);}
  async function save(){
    if(!state.compositionId)return;
    const payload={nodes:state.nodes.map(n=>({id:n.id,block_ref:n.block_ref,x:n.x,y:n.y,z_index:n.z_index,collapsed:n.collapsed,body_override:n.text})),edges:state.edges,view_state:{...state.view,groups:state.groups}};
    const r=await api("/api/compositions/"+state.compositionId+"/graph",{method:"PUT",body:JSON.stringify(payload)}).catch(()=>null);
    if(r?.ok)state.dirty=false;
  }
  function markDirty(auto=true){state.dirty=true;if(auto)saveDebounced();}
  async function load(){
    let r=await api("/api/compositions/graph",{method:"POST",body:JSON.stringify({title:"Prompt Graph"})});
    if(!r.ok)return;const d=await r.json();state.compositionId=d.id;try{localStorage.setItem("promptlib.nodeCanvasComposition",String(d.id));}catch(_){ }await save();
  }
  async function openExisting(){
    const r=await api("/api/compositions");if(!r.ok)return;const list=await r.json();let preferred=null;try{preferred=localStorage.getItem("promptlib.nodeCanvasComposition");}catch(_){ }const c=(preferred&&list.find(x=>String(x.id)===String(preferred)))||list?.[0];if(!c)return;
    state.compositionId=c.id;try{localStorage.setItem("promptlib.nodeCanvasComposition",String(c.id));}catch(_){ }const g=await api("/api/compositions/"+c.id+"/graph").then(x=>x.json()).catch(()=>null);if(!g)return;
    const ref=new Map(blocks().map(b=>[String(b.id||b.label),b]));
    state.nodes=(g.nodes||[]).map(row=>{const b=ref.get(String(row.block_ref));return {id:String(row.id),block_ref:row.block_ref,label:b?.label||row.block_ref,text:row.body_override??b?.text??"",x:+row.x||0,y:+row.y||0,z_index:+row.z_index||0,collapsed:!!row.collapsed,width:260,height:140}});
    state.edges=(g.edges||[]).map(e=>({id:String(e.id),source:String(e.source_block_id),target:String(e.target_block_id),source_port:e.source_port,target_port:e.target_port,relation:e.relation}));
    try{const saved=JSON.parse(g.composition.view_state||"{}")||{};state.view={x:+saved.x||80,y:+saved.y||60,z:+saved.z||+saved.zoom||1};state.groups=Array.isArray(saved.groups)?saved.groups:[]}catch(_){}
    render();
  }
  function shell(){
    root=document.createElement("div");root.className="pln-shell";root.innerHTML=`
      <aside class="pln-palette"><div class="pln-panel-head"><span>Components</span><button class="pln-tool" id="plnNew">+</button></div><input class="pln-search" placeholder="Search components"><div class="pln-palette-list"></div></aside>
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
    state=blank();root=shell();host.appendChild(root);wireShell();await openExisting();render();
  }
  function maybe(){const host=document.getElementById("componentsWorkspace");if(host&&host.offsetParent!==null&&!host.dataset.plnReady)init();}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(maybe,700));else setTimeout(maybe,700);
  document.addEventListener("click",e=>{if(e.target.closest('[data-view="components"]'))setTimeout(init,250);});
  window.PL_NodeCanvas={init};
})();