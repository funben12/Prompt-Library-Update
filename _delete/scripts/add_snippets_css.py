import os
os.chdir(r'C:\Users\Eugene Phillips\Desktop\Prompt Library Update')

css = open('static/app.css', 'r', encoding='utf-8').read()

# 1. Replace gallery CSS section (add preview modal styles)
OLD_GAL_CSS = """/* ---- Template Gallery ---- */
.gal-body { display: flex; flex-direction: column; min-height: 0; }
.gal-toolbar { display: flex; flex-direction: column; gap: var(--sp-3); padding: var(--sp-4) var(--sp-5) var(--sp-3); border-bottom: 1px solid var(--line); }
.gal-search { max-width: 420px; }
.gal-cat-row { display: flex; flex-wrap: wrap; gap: var(--sp-2); }
.gal-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--sp-4); padding: var(--sp-5); overflow-y: auto; align-content: start; }
.gal-card {
  display: flex; flex-direction: column; gap: var(--sp-2);
  background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-lg);
  padding: var(--sp-4); box-shadow: var(--shadow-sm);
  transition: border-color var(--t-fast), box-shadow var(--t-fast), transform var(--t-fast);
}
.gal-card:hover { border-color: var(--accent-line); box-shadow: var(--shadow-md); transform: translateY(-2px); }
.gal-card-top { display: flex; }
.gal-card-cat { font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--accent); background: var(--accent-soft); border-radius: 4px; padding: 3px 7px; }
.gal-card-title { font-family: var(--ff-display); font-size: var(--fs-md); font-weight: 600; color: var(--ink); }
.gal-card-desc { font-size: var(--fs-sm); color: var(--ink-2); }
.gal-card-prev { font-family: var(--ff-mono); font-size: 11.5px; color: var(--ink-4); line-height: 1.5; flex: 1; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.gal-card-actions { display: flex; gap: var(--sp-2); margin-top: var(--sp-2); }
.gal-card-actions .btn { padding: 6px 10px; font-size: var(--fs-sm); flex: 1; justify-content: center; }
.gal-empty { padding: var(--sp-8); }"""

NEW_GAL_CSS = """/* ---- Template Gallery ---- */
.gal-body { display: flex; flex-direction: column; min-height: 0; position: relative; }
.gal-toolbar { display: flex; flex-direction: column; gap: var(--sp-3); padding: var(--sp-4) var(--sp-5) var(--sp-3); border-bottom: 1px solid var(--line); }
.gal-search { max-width: 420px; }
.gal-cat-row { display: flex; flex-wrap: wrap; gap: var(--sp-2); }
.gal-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--sp-4); padding: var(--sp-5); overflow-y: auto; align-content: start; }
.gal-card {
  display: flex; flex-direction: column; gap: var(--sp-2);
  background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-lg);
  padding: var(--sp-4); box-shadow: var(--shadow-sm);
  transition: border-color var(--t-fast), box-shadow var(--t-fast), transform var(--t-fast);
}
.gal-card:hover { border-color: var(--accent-line); box-shadow: var(--shadow-md); transform: translateY(-2px); }
.gal-card-top { display: flex; }
.gal-card-cat { font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; border-radius: 4px; padding: 3px 7px; }
.gal-card-title { font-family: var(--ff-display); font-size: var(--fs-md); font-weight: 600; color: var(--ink); }
.gal-card-desc { font-size: var(--fs-sm); color: var(--ink-2); }
.gal-card-prev { font-family: var(--ff-mono); font-size: 11.5px; color: var(--ink-4); line-height: 1.5; flex: 1; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.gal-card-actions { display: flex; gap: var(--sp-2); margin-top: var(--sp-2); }
.gal-card-actions .btn { padding: 6px 10px; font-size: var(--fs-sm); flex: 1; justify-content: center; }
.gal-empty { padding: var(--sp-8); }

/* Gallery preview modal */
.gal-preview-modal { position: fixed; inset: 0; z-index: 900; display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.55); backdrop-filter: blur(4px);
  opacity: 0; pointer-events: none; transition: opacity var(--t-fast); }
.gal-preview-modal.open { opacity: 1; pointer-events: all; }
.gal-preview-modal[hidden] { display: none !important; }
.gal-preview-card {
  width: min(760px, 92vw); max-height: 86vh;
  background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-xl);
  box-shadow: var(--shadow-xl); display: flex; flex-direction: column; overflow: hidden;
}
.gal-preview-header { display: flex; align-items: flex-start; gap: var(--sp-3); padding: var(--sp-5) var(--sp-5) var(--sp-3); border-bottom: 1px solid var(--line); }
.gal-preview-meta { flex: 1; display: flex; flex-direction: column; gap: var(--sp-1); }
.gal-preview-title { font-family: var(--ff-display); font-size: var(--fs-lg); font-weight: 700; color: var(--ink); margin: 0; }
.gal-preview-desc { font-size: var(--fs-sm); color: var(--ink-2); margin: 0; }
.gal-preview-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: var(--sp-1); }
.gal-preview-tag { font-size: 11px; font-weight: 600; letter-spacing: 0.04em; background: var(--surface-2); color: var(--ink-3); border-radius: 4px; padding: 2px 7px; }
.gal-preview-body {
  flex: 1; overflow-y: auto; margin: 0; padding: var(--sp-5);
  font-family: var(--ff-mono); font-size: 13px; line-height: 1.7; color: var(--ink);
  white-space: pre-wrap; word-break: break-word;
  background: var(--bg); border-top: none; border-bottom: 1px solid var(--line);
}
.gal-preview-footer { display: flex; gap: var(--sp-3); padding: var(--sp-4) var(--sp-5); background: var(--surface); }
.gal-preview-footer .btn { padding: 8px 18px; }"""

assert OLD_GAL_CSS in css, "OLD_GAL_CSS not found"
css = css.replace(OLD_GAL_CSS, NEW_GAL_CSS, 1)

# 2. Replace snippets CSS section
OLD_SNIP_CSS = """/* ---- Snippets ---- */
.snip-list { display: flex; flex-direction: column; gap: var(--sp-1); padding: var(--sp-2); }
.snip-item {
  display: flex; flex-direction: column; gap: 2px; text-align: left; width: 100%; cursor: pointer;
  background: transparent; border: 1px solid transparent; border-radius: var(--r-md); padding: var(--sp-3);
  transition: background var(--t-fast), border-color var(--t-fast);
}
.snip-item:hover { background: var(--surface-2); }
.snip-item.active { background: var(--accent-soft); border-color: var(--accent-line); }
.snip-item-label { font-size: var(--fs-sm); font-weight: 600; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.snip-item-prev { font-size: 11.5px; color: var(--ink-4); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }"""

NEW_SNIP_CSS = """/* ---- Snippets v2 ---- */
.snip-stats-bar { display: flex; align-items: center; gap: var(--sp-5); padding: 8px var(--sp-5); border-bottom: 1px solid var(--line); background: var(--bg); flex-shrink: 0; }
.snip-stat { display: flex; align-items: center; gap: 5px; font-size: var(--fs-sm); color: var(--ink-3); }
.snip-stat .material-symbols-outlined { font-size: 16px; }
.snip-stat strong { color: var(--ink); font-weight: 700; }
.snip-body-v2 { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); min-height: 0; height: 100%; gap: 0; }
.snip-list-panel { display: flex; flex-direction: column; min-height: 0; border-right: 1px solid var(--line); overflow: hidden; }
.snip-toolbar { padding: var(--sp-3) var(--sp-4); border-bottom: 1px solid var(--line); display: flex; flex-direction: column; gap: var(--sp-2); }
.snip-tag-row { display: flex; flex-wrap: wrap; gap: 6px; min-height: 0; }
.snip-cards { flex: 1; overflow-y: auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: var(--sp-3); padding: var(--sp-4); align-content: start; }
.snip-empty { flex: 1; }
.snip-card {
  display: flex; flex-direction: column; gap: var(--sp-1);
  background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-md);
  padding: var(--sp-3); cursor: pointer; min-height: 0;
  transition: border-color var(--t-fast), box-shadow var(--t-fast), transform var(--t-fast);
  border-left: 3px solid transparent;
}
.snip-card:hover { border-color: var(--accent-line); transform: translateY(-1px); box-shadow: var(--shadow-sm); }
.snip-card.active { border-color: var(--accent); background: var(--accent-soft); }
.snip-card.snip-col-red    { border-left-color: #ef4444; }
.snip-card.snip-col-orange { border-left-color: #f97316; }
.snip-card.snip-col-yellow { border-left-color: #eab308; }
.snip-card.snip-col-green  { border-left-color: #22c55e; }
.snip-card.snip-col-blue   { border-left-color: #3b82f6; }
.snip-card.snip-col-purple { border-left-color: #a855f7; }
.snip-card-top { display: flex; align-items: center; gap: var(--sp-1); min-width: 0; }
.snip-pin-badge { font-size: 14px; color: var(--accent); flex: 0 0 auto; }
.snip-card-label { font-size: var(--fs-sm); font-weight: 600; color: var(--ink); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.snip-quick-copy { width: 22px; height: 22px; border-radius: 4px; flex: 0 0 auto; opacity: 0; transition: opacity var(--t-fast); display: flex; align-items: center; justify-content: center; }
.snip-quick-copy .material-symbols-outlined { font-size: 14px; }
.snip-card:hover .snip-quick-copy { opacity: 1; }
.snip-card-preview { font-size: 11.5px; color: var(--ink-4); line-height: 1.5; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; margin: 0; flex: 1; }
.snip-card-footer { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-2); margin-top: 2px; }
.snip-tag-chips { display: flex; flex-wrap: wrap; gap: 3px; }
.snip-tag-chip { font-size: 10px; font-weight: 600; background: var(--surface-2); color: var(--ink-3); border-radius: 3px; padding: 1px 5px; text-transform: lowercase; }
.snip-char-count { font-size: 10.5px; color: var(--ink-4); white-space: nowrap; flex: 0 0 auto; }
/* Editor panel v2 */
.snip-editor-v2 { display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
.snip-editor-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--sp-3); color: var(--ink-3); padding: var(--sp-8); text-align: center; }
.snip-editor-empty .material-symbols-outlined { font-size: 40px; opacity: 0.35; }
.snip-editor-empty p { font-size: var(--fs-sm); color: var(--ink-3); line-height: 1.6; }
.snip-editor-form { display: flex; flex-direction: column; min-height: 0; flex: 1; }
.snip-editor-top { display: flex; align-items: center; justify-content: space-between; padding: var(--sp-3) var(--sp-4); border-bottom: 1px solid var(--line); flex-shrink: 0; }
.snip-editor-scroll { flex: 1; overflow-y: auto; padding: var(--sp-4); display: flex; flex-direction: column; gap: var(--sp-3); }
/* Colour strip */
.snip-colour-strip { display: flex; align-items: center; gap: 6px; }
.snip-col-btn {
  width: 18px; height: 18px; border-radius: 50%; border: 2px solid transparent;
  background: var(--surface-2); cursor: pointer; transition: transform var(--t-fast), border-color var(--t-fast);
  background-color: var(--col, var(--surface-2));
}
.snip-col-btn:hover { transform: scale(1.2); }
.snip-col-btn.active { border-color: var(--ink); transform: scale(1.15); }
.snip-col-btn:first-child { background: var(--surface-2); border: 2px solid var(--line); }
.snip-col-btn:first-child.active { border-color: var(--ink); }"""

assert OLD_SNIP_CSS in css, "OLD_SNIP_CSS not found"
css = css.replace(OLD_SNIP_CSS, NEW_SNIP_CSS, 1)

open('static/app.css', 'w', encoding='utf-8').write(css)
print("app.css updated.")
print("New CSS length:", len(css))
