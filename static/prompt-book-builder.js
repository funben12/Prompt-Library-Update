/* Prompt Book Builder workspace [PRO]
   Turn prompts and guidance into a book of how to do things.
   Self contained: every id and class is prefixed pbb- and lives inside #promptBookBuilderWorkspace.
   Saved state is localStorage only (prompt-book-builder.v1). No database, no network except the read only library list. */
(function () {
    'use strict';

    const ROOT_ID = 'promptBookBuilderWorkspace';
    const STORE_KEY = 'prompt-book-builder.v1';
    const SCHEMA = 'prompt-book-builder';
    const SCHEMA_VERSION = 1;
    const LIMITS = { books: 100, chapters: 200, blocks: 200, text: 200000, short: 300 };
    const VAR_RE = /\[\[[^\[\]\n]{1,80}\]\]|\{\{[^{}\n]{1,80}\}\}|\(\([^()\n]{1,80}\)\)/g;

    const TYPES = {
        guidance: { label: 'Guidance', icon: 'article' },
        steps: { label: 'Step list', icon: 'format_list_numbered' },
        callout: { label: 'Callout', icon: 'lightbulb' },
        prompt: { label: 'Prompt', icon: 'terminal' },
    };

    // ---------- small helpers ----------
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const ms = (name, cls = '') => `<span class="material-symbols-outlined${cls ? ' ' + cls : ''}" aria-hidden="true">${name}</span>`;
    const toast = (msg, kind = 'info') => { if (window.PL_toast) window.PL_toast(msg, kind); };
    const fmtN = n => Number(n || 0).toLocaleString('en-GB');
    let uidN = 0;
    const uid = p => p + Date.now().toString(36) + (++uidN).toString(36) + Math.random().toString(36).slice(2, 6);
    const words = s => (String(s || '').trim().match(/\S+/g) || []).length;
    const slug = s => String(s || '').toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-');
    const reduceMotion = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const stepItems = text => String(text || '').split('\n').map(l => l.replace(/^\s*(?:\d+[.)]|[*\-+\u2022])\s+/, '').trim()).filter(Boolean);
    const varsIn = text => [...new Set(String(text || '').match(VAR_RE) || [])];
    const varHl = escaped => escaped.replace(VAR_RE, m => `<span class="pbb-var">${m}</span>`);

    // ---------- safe markdown subset: headings, bold, italic, bullet and numbered lists ----------
    function inline(raw) {
        const keep = [];
        let s = String(raw ?? '').replace(/[\uE000\uE001]/g, '').replace(VAR_RE, m => { keep.push(m); return '\uE000' + (keep.length - 1) + '\uE001'; });
        s = esc(s);
        s = s.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>');
        s = s.replace(/(^|[^*\w])\*([^*\s][^*\n]*?)\*(?!\*)/g, '$1<em>$2</em>');
        s = s.replace(/(^|[^\w])_([^_\s][^_\n]*?)_(?!\w)/g, '$1<em>$2</em>');
        return s.replace(/\uE000(\d+)\uE001/g, (_, i) => `<span class="pbb-var">${esc(keep[+i])}</span>`);
    }
    function renderMd(src, base = 3) {
        const lines = String(src || '').replace(/\r\n?/g, '\n').split('\n');
        const isBullet = l => /^\s*[*\-+]\s+\S/.test(l);
        const isNum = l => /^\s*\d+[.)]\s+\S/.test(l);
        const isHead = l => /^#{1,3}\s+\S/.test(l);
        const out = [];
        let i = 0;
        while (i < lines.length) {
            const l = lines[i];
            if (!l.trim()) { i++; continue; }
            if (isHead(l)) {
                const m = /^(#{1,3})\s+(.*)$/.exec(l);
                const lv = Math.min(6, base + m[1].length - 1);
                out.push(`<h${lv}>${inline(m[2].trim())}</h${lv}>`);
                i++;
            } else if (isBullet(l)) {
                const items = [];
                while (i < lines.length && isBullet(lines[i])) { items.push(`<li>${inline(lines[i].replace(/^\s*[*\-+]\s+/, ''))}</li>`); i++; }
                out.push(`<ul>${items.join('')}</ul>`);
            } else if (isNum(l)) {
                const items = [];
                while (i < lines.length && isNum(lines[i])) { items.push(`<li>${inline(lines[i].replace(/^\s*\d+[.)]\s+/, ''))}</li>`); i++; }
                out.push(`<ol>${items.join('')}</ol>`);
            } else {
                const para = [];
                while (i < lines.length && lines[i].trim() && !isHead(lines[i]) && !isBullet(lines[i]) && !isNum(lines[i])) { para.push(inline(lines[i])); i++; }
                out.push(`<p>${para.join('<br>')}</p>`);
            }
        }
        return out.join('');
    }

    // ---------- data model and sanitising ----------
    const str = (v, max = LIMITS.text) => (typeof v === 'string' ? v : v == null ? '' : String(v)).replace(/\u0000/g, '').slice(0, max);
    function cleanBlock(b) {
        if (!b || typeof b !== 'object') return null;
        const id = uid('b');
        if (b.type === 'guidance') return { id, type: 'guidance', text: str(b.text) };
        if (b.type === 'steps') return { id, type: 'steps', title: str(b.title, LIMITS.short), text: str(b.text) };
        if (b.type === 'callout') return { id, type: 'callout', kind: b.kind === 'warning' ? 'warning' : 'tip', text: str(b.text) };
        if (b.type === 'prompt') {
            const sid = Number(b.sourceId);
            return { id, type: 'prompt', title: str(b.title, LIMITS.short), content: str(b.content), note: str(b.note, 2000), sourceId: b.sourceId != null && b.sourceId !== '' && Number.isFinite(sid) ? sid : null };
        }
        return null;
    }
    function cleanBook(b, keepId) {
        if (!b || typeof b !== 'object') return null;
        const chapters = (Array.isArray(b.chapters) ? b.chapters : []).slice(0, LIMITS.chapters).filter(c => c && typeof c === 'object').map(c => ({
            id: uid('c'),
            title: str(c.title, LIMITS.short),
            blocks: (Array.isArray(c.blocks) ? c.blocks : []).slice(0, LIMITS.blocks).map(cleanBlock).filter(Boolean),
        }));
        return {
            id: keepId && typeof b.id === 'string' && /^[\w-]{1,60}$/.test(b.id) ? b.id : uid('k'),
            title: str(b.title, LIMITS.short), subtitle: str(b.subtitle, LIMITS.short), author: str(b.author, LIMITS.short),
            edition: str(b.edition, LIMITS.short), intro: str(b.intro),
            chapters, updated: typeof b.updated === 'string' && !isNaN(Date.parse(b.updated)) ? b.updated : new Date().toISOString(),
        };
    }
    const newBook = () => ({ id: uid('k'), title: 'Untitled Book', subtitle: '', author: '', edition: '', intro: '', chapters: [{ id: uid('c'), title: '', blocks: [] }], updated: new Date().toISOString() });
    function newBlock(type, seed) {
        const id = uid('b');
        if (type === 'guidance') return { id, type, text: '' };
        if (type === 'steps') return { id, type, title: '', text: '' };
        if (type === 'callout') return { id, type, kind: 'tip', text: '' };
        return { id, type: 'prompt', title: '', content: '', note: '', sourceId: null, ...(seed || {}) };
    }
    const cloneChapter = c => ({ id: uid('c'), title: c.title, blocks: c.blocks.map(b => ({ ...b, id: uid('b') })) });

    function blockText(b) {
        if (b.type === 'prompt') return [b.title, b.content, b.note].join(' ');
        if (b.type === 'steps') return [b.title, b.text].join(' ');
        return b.text || '';
    }
    function bookWords(book) {
        let n = words(book.title) + words(book.subtitle) + words(book.intro);
        book.chapters.forEach(c => { n += words(c.title); c.blocks.forEach(b => { n += words(blockText(b)); }); });
        return n;
    }

    // ---------- storage ----------
    let store = { v: 1, active: null, books: [] };
    let saveTimer = 0, dirty = false, quotaWarned = false;
    function loadStore() {
        let raw = null, data = null;
        try { raw = localStorage.getItem(STORE_KEY); } catch (e) { /* storage blocked */ }
        if (raw) {
            try { data = JSON.parse(raw); } catch (e) { try { localStorage.setItem(STORE_KEY + '.corrupt', raw); } catch (_) { /* ignore */ } }
        }
        const books = data && Array.isArray(data.books) ? data.books.slice(0, LIMITS.books).map(b => cleanBook(b, true)).filter(Boolean) : [];
        const active = data && books.some(b => b.id === data.active) ? data.active : (books[0] && books[0].id) || null;
        return { v: 1, active, books };
    }
    function writeStore() {
        clearTimeout(saveTimer); saveTimer = 0;
        if (!dirty) return;
        try {
            localStorage.setItem(STORE_KEY, JSON.stringify(store));
            dirty = false;
            setSaved('Saved');
        } catch (e) {
            setSaved('Not saved');
            if (!quotaWarned) { quotaWarned = true; toast('Could not save your books on this device. Export a JSON backup.', 'error'); }
        }
    }
    function touch(structural) {
        const b = book();
        if (b) b.updated = new Date().toISOString();
        dirty = true;
        setSaved('Saving');
        clearTimeout(saveTimer);
        saveTimer = setTimeout(writeStore, structural ? 120 : 400);
    }
    const book = () => store.books.find(b => b.id === store.active) || null;

    // ---------- export builders ----------
    const chapterLabel = (c, i) => c.title.trim() ? c.title.trim() : 'Untitled chapter';
    const bookTitle = b => b.title.trim() || 'Untitled Book';

    function bookHtml(b, idp) {
        const meta = [b.author.trim() && `<p class="pbb-cover-author">${esc(b.author.trim())}</p>`, b.edition.trim() && `<p class="pbb-cover-edition">${esc(b.edition.trim())}</p>`].filter(Boolean).join('');
        const hasIntro = b.intro.trim().length > 0;
        let h = `<section class="pbb-page pbb-cover" id="${idp}cover"><div class="pbb-cover-inner"><h1 class="pbb-cover-title">${esc(bookTitle(b))}</h1>${b.subtitle.trim() ? `<p class="pbb-cover-sub">${esc(b.subtitle.trim())}</p>` : ''}<div class="pbb-cover-rule"></div>${meta}</div></section>`;
        const toc = [];
        if (hasIntro) toc.push(`<li><a href="#${idp}intro" data-jump><span class="pbb-toc-num"></span><span class="pbb-toc-t">Introduction</span></a></li>`);
        b.chapters.forEach((c, i) => toc.push(`<li><a href="#${idp}ch-${i + 1}" data-jump><span class="pbb-toc-num">${i + 1}</span><span class="pbb-toc-t">${esc(chapterLabel(c, i))}</span></a></li>`));
        h += `<nav class="pbb-page pbb-toc" id="${idp}contents" aria-label="Contents"><h2 class="pbb-page-h">Contents</h2>${toc.length ? `<ol class="pbb-toc-list">${toc.join('')}</ol>` : '<p class="pbb-empty-note">This book has no chapters yet.</p>'}</nav>`;
        if (hasIntro) h += `<section class="pbb-page pbb-intro" id="${idp}intro"><h2 class="pbb-page-h">Introduction</h2><div class="pbb-prose">${renderMd(b.intro, 3)}</div></section>`;
        b.chapters.forEach((c, i) => {
            const blocks = c.blocks.map(x => blockHtml(x)).join('');
            h += `<section class="pbb-page pbb-chapter" id="${idp}ch-${i + 1}"><p class="pbb-chap-num">Chapter <span>${i + 1}</span></p><h2 class="pbb-page-h">${esc(chapterLabel(c, i))}</h2>${blocks || '<p class="pbb-empty-note">No content in this chapter yet.</p>'}</section>`;
        });
        return h;
    }
    function blockHtml(b) {
        if (b.type === 'guidance') return b.text.trim() ? `<div class="pbb-prose">${renderMd(b.text, 3)}</div>` : '';
        if (b.type === 'steps') {
            const items = stepItems(b.text);
            return `<div class="pbb-steps">${b.title.trim() ? `<h3>${inline(b.title.trim())}</h3>` : ''}${items.length ? `<ol>${items.map(t => `<li>${inline(t)}</li>`).join('')}</ol>` : ''}</div>`;
        }
        if (b.type === 'callout') {
            const warn = b.kind === 'warning';
            return `<aside class="pbb-callout pbb-callout-${warn ? 'warning' : 'tip'}"><p class="pbb-callout-label">${warn ? 'Warning' : 'Tip'}</p><div class="pbb-prose">${renderMd(b.text, 4)}</div></aside>`;
        }
        const when = b.note.trim() ? `<p class="pbb-when"><strong>When to use it.</strong> ${inline(b.note.trim())}</p>` : '';
        return `<figure class="pbb-prompt"><figcaption><span class="pbb-prompt-label">Prompt</span>${b.title.trim() ? `<span class="pbb-prompt-title">${esc(b.title.trim())}</span>` : ''}<button type="button" class="pbb-copy" data-copy>Copy</button></figcaption>${when}<pre class="pbb-pre">${varHl(esc(b.content))}</pre></figure>`;
    }

    const mdSafe = t => String(t).replace(/</g, '&lt;');
    function shiftHeadings(text, base) {
        return String(text || '').replace(/\r\n?/g, '\n').split('\n').map(l => {
            const m = /^(#{1,3})(\s+.*)$/.exec(l);
            return mdSafe(m ? '#'.repeat(Math.min(6, base + m[1].length - 1)) + m[2] : l);
        }).join('\n');
    }
    function buildMarkdown(b) {
        const out = [`# ${mdSafe(bookTitle(b))}`];
        if (b.subtitle.trim()) out.push('', `_${mdSafe(b.subtitle.trim())}_`);
        if (b.author.trim()) out.push('', `By ${mdSafe(b.author.trim())}`);
        if (b.edition.trim()) out.push('', mdSafe(b.edition.trim()));
        const toc = [];
        if (b.intro.trim()) toc.push('* [Introduction](#introduction)');
        const heads = b.chapters.map((c, i) => `Chapter ${i + 1}${c.title.trim() ? ': ' + c.title.trim() : ''}`);
        heads.forEach(t => toc.push(`* [${mdSafe(t).replace(/([\[\]])/g, '\\$1')}](#${slug(t)})`));
        out.push('', '## Contents', '', toc.length ? toc.join('\n') : '_This book has no chapters yet._');
        if (b.intro.trim()) out.push('', '## Introduction', '', shiftHeadings(b.intro, 3));
        b.chapters.forEach((c, i) => {
            out.push('', `## ${mdSafe(heads[i])}`);
            c.blocks.forEach(x => {
                if (x.type === 'guidance') { if (x.text.trim()) out.push('', shiftHeadings(x.text, 3)); }
                else if (x.type === 'steps') {
                    const items = stepItems(x.text);
                    if (x.title.trim()) out.push('', `### ${mdSafe(x.title.trim())}`);
                    if (items.length) out.push('', items.map((t, n) => `${n + 1}. ${mdSafe(t)}`).join('\n'));
                } else if (x.type === 'callout') {
                    const lab = x.kind === 'warning' ? 'Warning' : 'Tip';
                    const lines = (x.text.trim() ? shiftHeadings(x.text, 4) : '').split('\n');
                    out.push('', `> **${lab}.** ${lines.shift() || ''}`.trimEnd(), ...lines.map(l => ('> ' + l).trimEnd()));
                } else {
                    out.push('', `### Prompt${x.title.trim() ? ': ' + mdSafe(x.title.trim()) : ''}`);
                    if (x.note.trim()) out.push('', `**When to use it.** ${mdSafe(x.note.trim())}`);
                    const runs = x.content.match(/`+/g) || [];
                    const fence = '`'.repeat(Math.max(2, ...runs.map(r => r.length)) + 1);
                    out.push('', fence + 'text', x.content.replace(/\r\n?/g, '\n'), fence);
                }
            });
        });
        return out.join('\n') + '\n';
    }

    const EXPORT_CSS = `
:root{color-scheme:light dark;--bg:oklch(94% .01 70);--paper:oklch(98.5% .006 80);--sunk:oklch(95% .01 70);--ink:oklch(20% .03 260);--ink2:oklch(34% .025 260);--mute:oklch(46% .015 260);--line:oklch(86% .014 70);--accent:oklch(38% .14 190);--accent-soft:oklch(94% .04 190);--warn:oklch(63% .18 52);--warn-soft:oklch(95% .045 70)}
@media (prefers-color-scheme:dark){:root{--bg:oklch(16% .012 70);--paper:oklch(21% .014 70);--sunk:oklch(15% .012 70);--ink:oklch(93% .015 260);--ink2:oklch(82% .015 260);--mute:oklch(68% .012 260);--line:oklch(32% .016 70);--accent:oklch(74% .14 190);--accent-soft:oklch(27% .07 190);--warn:oklch(78% .17 52);--warn-soft:oklch(27% .06 52)}}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.65 "Iowan Old Style",Charter,Georgia,serif}
.pbb-book{max-width:46rem;margin:0 auto;padding:1.5rem 1rem 4rem;display:grid;gap:1.25rem}
.pbb-page{background:var(--paper);border:1px solid var(--line);border-radius:10px;padding:clamp(1.25rem,5vw,3.25rem);overflow-wrap:anywhere}
.pbb-page-h{font-size:1.9rem;line-height:1.2;margin:0 0 1.25rem;letter-spacing:-.01em}
.pbb-cover{min-height:min(34rem,80vh);display:grid;align-items:center}
.pbb-cover-title{font-size:clamp(2.2rem,8vw,3.4rem);line-height:1.08;margin:0;letter-spacing:-.02em}
.pbb-cover-sub{font-size:1.25rem;color:var(--ink2);margin:.9rem 0 0}
.pbb-cover-rule{width:3.5rem;height:0;border-top:3px solid var(--accent);margin:1.75rem 0 1.25rem}
.pbb-cover-author{margin:0;font-size:1.1rem}
.pbb-cover-edition{margin:.2rem 0 0;color:var(--mute);font-size:.95rem}
.pbb-toc-list{list-style:none;margin:0;padding:0}
.pbb-toc-list li{border-bottom:1px solid var(--line)}
.pbb-toc-list a{display:flex;gap:1rem;align-items:baseline;padding:.65rem 0;color:var(--ink);text-decoration:none}
.pbb-toc-list a:hover .pbb-toc-t{color:var(--accent);text-decoration:underline}
.pbb-toc-num{flex:0 0 2rem;font:600 .85rem ui-monospace,"JetBrains Mono",Consolas,monospace;color:var(--mute)}
.pbb-chap-num{margin:0 0 .35rem;font:700 .72rem/1 system-ui,sans-serif;letter-spacing:.07em;text-transform:uppercase;color:var(--accent)}
.pbb-chap-num span{font-family:ui-monospace,"JetBrains Mono",Consolas,monospace}
.pbb-prose h3,.pbb-steps h3{font-size:1.3rem;margin:1.6rem 0 .5rem;line-height:1.25}
.pbb-prose h4{font-size:1.12rem;margin:1.3rem 0 .4rem}
.pbb-prose h5,.pbb-prose h6{font-size:1rem;margin:1.1rem 0 .3rem}
.pbb-prose p{margin:0 0 .9rem}
.pbb-prose ul,.pbb-prose ol,.pbb-steps ol{margin:0 0 1rem;padding-left:1.5rem}
.pbb-prose li,.pbb-steps li{margin:.25rem 0}
.pbb-steps{margin:1.4rem 0}
.pbb-steps ol{padding-left:0;list-style:none;counter-reset:s}
.pbb-steps li{counter-increment:s;display:grid;grid-template-columns:2rem 1fr;gap:.5rem;padding:.55rem 0;border-bottom:1px solid var(--line)}
.pbb-steps li::before{content:counter(s);font:700 .85rem/1.9 ui-monospace,"JetBrains Mono",Consolas,monospace;color:var(--accent)}
.pbb-callout{margin:1.4rem 0;padding:.9rem 1.1rem;border:1px solid var(--line);border-radius:8px;background:var(--accent-soft)}
.pbb-callout-warning{background:var(--warn-soft)}
.pbb-callout-label{margin:0 0 .35rem;font:700 .72rem/1 system-ui,sans-serif;letter-spacing:.07em;text-transform:uppercase}
.pbb-callout .pbb-prose :last-child{margin-bottom:0}
.pbb-prompt{margin:1.6rem 0;padding:0;border:1px solid var(--line);border-radius:8px;overflow:hidden;background:var(--sunk)}
.pbb-prompt figcaption{display:flex;align-items:center;gap:.75rem;padding:.55rem .8rem;border-bottom:1px solid var(--line);background:var(--paper);font-family:system-ui,sans-serif}
.pbb-prompt-label{font:700 .72rem/1 system-ui,sans-serif;letter-spacing:.07em;text-transform:uppercase;color:var(--accent)}
.pbb-prompt-title{flex:1;min-width:0;font-weight:600;font-size:.92rem}
.pbb-copy{margin-left:auto;padding:.35rem .8rem;border:1px solid var(--line);border-radius:6px;background:var(--paper);color:var(--ink);font:600 .8rem system-ui,sans-serif;cursor:pointer}
.pbb-copy:hover{border-color:var(--accent);color:var(--accent)}
.pbb-when{margin:0;padding:.7rem .9rem 0;font-size:.92rem;color:var(--ink2);font-family:system-ui,sans-serif}
.pbb-pre{margin:0;padding:.9rem;font:.86rem/1.6 ui-monospace,"JetBrains Mono",Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere;color:var(--ink)}
.pbb-var{color:var(--accent);font-weight:600}
.pbb-empty-note{color:var(--mute);font-style:italic}
@media (max-width:560px){body{font-size:16px}.pbb-book{padding:.75rem .5rem 3rem}.pbb-page{padding:1.25rem 1rem}}
@media print{
:root{color-scheme:light;--bg:oklch(100% 0 0);--paper:oklch(100% 0 0);--sunk:oklch(97% 0 0);--ink:oklch(15% 0 0);--ink2:oklch(28% 0 0);--mute:oklch(40% 0 0);--line:oklch(80% 0 0);--accent:oklch(33% .12 190);--accent-soft:oklch(96% .02 190);--warn-soft:oklch(97% .03 70)}
@page{margin:18mm 16mm}
body{font-size:11.5pt;background:#fff}
.pbb-book{max-width:none;padding:0;display:block}
.pbb-page{border:0;border-radius:0;padding:0;background:none;break-after:page}
.pbb-page:last-child{break-after:auto}
.pbb-cover{min-height:70vh}
.pbb-page-h,.pbb-prose h3,.pbb-prose h4,.pbb-steps h3{break-after:avoid}
.pbb-prompt,.pbb-callout,.pbb-steps li{break-inside:avoid}
.pbb-copy{display:none}
a{color:inherit;text-decoration:none}
.pbb-toc-list a{padding:.4rem 0}
}`;
    const EXPORT_JS = `document.addEventListener('click',function(e){var b=e.target.closest('[data-copy]');if(!b)return;var pre=b.closest('figure').querySelector('pre');var t=pre.textContent;function done(){var o=b.textContent;b.textContent='Copied';setTimeout(function(){b.textContent=o},1400)}function fb(){var a=document.createElement('textarea');a.value=t;a.style.position='fixed';a.style.opacity='0';document.body.appendChild(a);a.select();try{document.execCommand('copy');done()}catch(x){}document.body.removeChild(a)}if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(t).then(done,fb)}else{fb()}});`;
    function buildHtmlDoc(b) {
        return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(bookTitle(b))}</title>${b.author.trim() ? `<meta name="author" content="${esc(b.author.trim())}">` : ''}<style>${EXPORT_CSS}</style></head><body><main class="pbb-book">${bookHtml(b, '')}</main><script>${EXPORT_JS}</script></body></html>\n`;
    }
    function buildJson(b) {
        const clean = { title: b.title, subtitle: b.subtitle, author: b.author, edition: b.edition, intro: b.intro, chapters: b.chapters.map(c => ({ title: c.title, blocks: c.blocks.map(x => { const o = { ...x }; delete o.id; return o; }) })) };
        return JSON.stringify({ schema: SCHEMA, version: SCHEMA_VERSION, exportedAt: new Date().toISOString(), book: clean }, null, 2) + '\n';
    }
    function parseImport(text) {
        let data;
        try { data = JSON.parse(text); } catch (e) { throw new Error('That file is not valid JSON.'); }
        if (!data || data.schema !== SCHEMA) throw new Error('That file is not a Prompt Book Builder export.');
        if (!Number.isInteger(data.version) || data.version < 1 || data.version > SCHEMA_VERSION) throw new Error('That export is from a newer version and cannot be read here.');
        if (!data.book || typeof data.book !== 'object') throw new Error('That export has no book in it.');
        const b = cleanBook(data.book, false);
        b.updated = new Date().toISOString();
        return b;
    }

    function download(name, mime, text) {
        const url = URL.createObjectURL(new Blob([text], { type: mime }));
        const a = document.createElement('a');
        a.href = url; a.download = name; a.rel = 'noopener';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
    }
    function copyText(text, btn) {
        const done = () => { if (!btn) return; const o = btn.textContent; btn.textContent = 'Copied'; setTimeout(() => { btn.textContent = o; }, 1400); };
        const fb = () => {
            const a = document.createElement('textarea');
            a.value = text; a.style.cssText = 'position:fixed;opacity:0';
            document.body.appendChild(a); a.select();
            try { document.execCommand('copy'); done(); } catch (e) { toast('Could not copy', 'error'); }
            a.remove();
        };
        if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fb); else fb();
    }

    // ---------- interface state ----------
    let root = null, mounted = false, opener = null;
    let sel = 'front';          // front matter or a chapter id
    let renaming = null;        // book id being renamed in the rail
    let tab = 'write';          // active pane on narrow screens
    let dialog = null;          // {opener, resolve, onClose}
    let previewTimer = 0;
    const mdPreview = new Set(); // guidance block ids shown rendered instead of the textarea
    const lib = { items: null, loading: false, error: false, q: '', added: new Set(), mode: 'add', replaceId: null };
    let dragKind = null, dragId = null;

    const $ = s => root.querySelector(s);
    const chapter = id => { const b = book(); return b ? b.chapters.find(c => c.id === id) || null : null; };
    function findBlock(id) {
        const b = book();
        if (!b) return null;
        for (const c of b.chapters) { const x = c.blocks.find(k => k.id === id); if (x) return { block: x, chapter: c }; }
        return null;
    }
    const curChapter = () => (sel === 'front' ? null : chapter(sel));
    const narrow = () => window.matchMedia && window.matchMedia('(max-width: 1100px)').matches;

    // ---------- markup built once ----------
    const MARKUP = `
<div class="ws-header pbb-header">
  <div class="ws-header-left">
    ${ms('menu_book', 'ws-header-icon')}
    <div>
      <h2 class="ws-title">Prompt Book Builder</h2>
      <p class="ws-subtitle">Turn prompts and guidance into a book of how to do things</p>
    </div>
  </div>
  <div class="ws-header-actions">
    <div class="pbb-menu" id="pbb-export-menu">
      <button type="button" class="btn btn-accent" id="pbb-export-btn" data-act="toggleExport" aria-haspopup="true" aria-expanded="false">${ms('download')}<span>Export</span>${ms('expand_more')}</button>
      <div class="pbb-menu-list" id="pbb-export-list" role="menu" hidden>
        <button type="button" class="pbb-menu-item" role="menuitem" data-act="export" data-kind="md">${ms('description')}<span class="pbb-menu-text"><b>Markdown</b><small>One file with a contents list</small></span></button>
        <button type="button" class="pbb-menu-item" role="menuitem" data-act="export" data-kind="html">${ms('language')}<span class="pbb-menu-text"><b>Web book</b><small>One HTML file, prints cleanly to PDF</small></span></button>
        <button type="button" class="pbb-menu-item" role="menuitem" data-act="export" data-kind="json">${ms('data_object')}<span class="pbb-menu-text"><b>JSON backup</b><small>Can be imported again</small></span></button>
      </div>
    </div>
    <button type="button" class="icon-btn" data-act="close" aria-label="Close Prompt Book Builder">${ms('close')}</button>
  </div>
</div>
<div class="pbb-tabs" role="tablist" aria-label="Book sections">
  <button type="button" role="tab" id="pbb-tab-books" data-act="tab" data-tab="books" aria-controls="pbb-pane-books">Books</button>
  <button type="button" role="tab" id="pbb-tab-outline" data-act="tab" data-tab="outline" aria-controls="pbb-pane-outline">Outline</button>
  <button type="button" role="tab" id="pbb-tab-write" data-act="tab" data-tab="write" aria-controls="pbb-pane-write">Write</button>
  <button type="button" role="tab" id="pbb-tab-preview" data-act="tab" data-tab="preview" aria-controls="pbb-pane-preview">Preview</button>
</div>
<div class="ws-body pbb-body" id="pbb-body" data-tab="write">
  <aside class="pbb-pane pbb-books" id="pbb-pane-books" role="tabpanel" aria-labelledby="pbb-tab-books">
    <div class="pbb-pane-head"><span class="pbb-label">Books <span class="pbb-mono pbb-count" id="pbb-book-count">0</span></span>
      <button type="button" class="icon-btn" data-act="newBook" aria-label="New book" title="New book">${ms('add')}</button></div>
    <ul class="pbb-book-list" id="pbb-book-list"></ul>
    <div class="pbb-pane-foot">
      <button type="button" class="btn btn-ghost pbb-wide" data-act="importBook">${ms('upload')}<span>Import JSON</span></button>
      <input type="file" id="pbb-import-file" accept=".json,application/json" hidden>
    </div>
  </aside>
  <nav class="pbb-pane pbb-outline" id="pbb-pane-outline" role="tabpanel" aria-labelledby="pbb-tab-outline" aria-label="Book outline">
    <div class="pbb-pane-head"><span class="pbb-label">Outline</span>
      <button type="button" class="icon-btn" data-act="addChapter" aria-label="Add chapter" title="Add chapter">${ms('add')}</button></div>
    <div class="pbb-pane-scroll" id="pbb-outline-list"></div>
    <p class="pbb-hint">Drag the handle to reorder, or press Alt with the up and down arrow keys on a chapter.</p>
  </nav>
  <main class="pbb-pane pbb-editor" id="pbb-pane-write" role="tabpanel" aria-labelledby="pbb-tab-write">
    <div class="pbb-pane-scroll" id="pbb-editor-scroll"><div class="pbb-editor-inner" id="pbb-editor"></div></div>
  </main>
  <section class="pbb-pane pbb-preview" id="pbb-pane-preview" role="tabpanel" aria-labelledby="pbb-tab-preview" aria-label="Reading preview">
    <div class="pbb-pane-head"><span class="pbb-label">Reading preview</span></div>
    <div class="pbb-pane-scroll pbb-pv-scroll" id="pbb-pv-scroll"><div class="pbb-book" id="pbb-pv-book"></div></div>
  </section>
</div>
<div class="pbb-statusbar" id="pbb-status" role="status"></div>
<div class="pbb-layer" id="pbb-layer"></div>`;

    // ---------- render: books rail ----------
    function renderRail() {
        $('#pbb-book-count').textContent = String(store.books.length);
        const list = $('#pbb-book-list');
        if (!store.books.length) { list.innerHTML = `<li class="pbb-empty">No books yet. Start one, or import a JSON export.</li>`; return; }
        list.innerHTML = store.books.map(b => {
            const cur = b.id === store.active;
            const nm = esc(bookTitle(b));
            const main = renaming === b.id
                ? `<input class="form-input pbb-rename" data-rename="${b.id}" value="${esc(b.title)}" maxlength="${LIMITS.short}" aria-label="Book title">`
                : `<button type="button" class="pbb-book-main" data-act="selBook" data-id="${b.id}"${cur ? ' aria-current="true"' : ''}><span class="pbb-book-title">${nm}</span><span class="pbb-book-meta pbb-mono"><span>${fmtN(b.chapters.length)} ${b.chapters.length === 1 ? 'chapter' : 'chapters'}</span><span>${fmtN(bookWords(b))} words</span></span></button>`;
            return `<li class="pbb-book-item${cur ? ' is-current' : ''}">${main}<span class="pbb-book-actions"><button type="button" class="icon-btn" data-act="renameBook" data-id="${b.id}" aria-label="Rename ${nm}" title="Rename">${ms('edit')}</button><button type="button" class="icon-btn danger" data-act="delBook" data-id="${b.id}" aria-label="Delete ${nm}" title="Delete">${ms('delete')}</button></span></li>`;
        }).join('');
        const ri = list.querySelector('.pbb-rename');
        if (ri) { ri.focus(); ri.select(); }
    }

    // ---------- render: outline ----------
    function blockLabel(x) {
        if (x.type === 'prompt') return x.title.trim() || 'Untitled prompt';
        if (x.type === 'steps') return x.title.trim() || 'Step list';
        if (x.type === 'callout') return x.kind === 'warning' ? 'Warning' : 'Tip';
        const first = (x.text.split('\n').find(l => l.trim()) || '').replace(/^#+\s*/, '').replace(/[*_]/g, '').trim();
        return first ? first.slice(0, 60) : 'Guidance';
    }
    function renderOutline() {
        const b = book(), el = $('#pbb-outline-list');
        if (!b) { el.innerHTML = ''; return; }
        let h = `<button type="button" class="pbb-ol-front${sel === 'front' ? ' is-current' : ''}" data-act="selFront"${sel === 'front' ? ' aria-current="true"' : ''}>${ms('article')}<span>Front matter</span></button>`;
        h += `<div class="pbb-ol-sec"><span class="pbb-label">Chapters <span class="pbb-mono pbb-count">${fmtN(b.chapters.length)}</span></span></div>`;
        if (!b.chapters.length) h += `<p class="pbb-empty">No chapters yet. Add the first one.</p>`;
        b.chapters.forEach((c, i) => {
            const cur = sel === c.id;
            h += `<div class="pbb-ol-ch${cur ? ' is-current' : ''}" data-dk="chapter" data-did="${c.id}"><span class="pbb-ol-grip" data-grip aria-hidden="true">${ms('drag_indicator')}</span><button type="button" class="pbb-ol-main" data-act="selChapter" data-id="${c.id}" data-kb-chapter="${c.id}"${cur ? ' aria-current="true"' : ''} aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"><span class="pbb-ol-num pbb-mono">${i + 1}</span><span class="pbb-ol-title${c.title.trim() ? '' : ' is-empty'}">${esc(chapterLabel(c, i))}</span><span class="pbb-ol-n pbb-mono">${c.blocks.length}</span></button></div>`;
            if (cur && c.blocks.length) {
                h += `<div class="pbb-ol-blocks">${c.blocks.map(x => `<button type="button" class="pbb-ol-block" data-act="gotoBlock" data-id="${x.id}">${ms(TYPES[x.type].icon)}<span>${esc(blockLabel(x))}</span></button>`).join('')}</div>`;
            }
        });
        el.innerHTML = h;
    }

    // ---------- render: editor ----------
    const iconBtn = (act, icon, label, data = '', cls = '', disabled = false) => `<button type="button" class="icon-btn${cls ? ' ' + cls : ''}" data-act="${act}" ${data} aria-label="${label}" title="${label}"${disabled ? ' disabled' : ''}>${ms(icon)}</button>`;
    function renderEditor(keepScroll) {
        const b = book(), el = $('#pbb-editor');
        const sc = $('#pbb-editor-scroll');
        const top = sc.scrollTop;
        if (!b) {
            el.innerHTML = `<div class="pbb-blank"><h3>No book selected</h3><p>Create a book to start writing.</p><button type="button" class="btn btn-accent" data-act="newBook">${ms('add')}<span>New book</span></button></div>`;
            return;
        }
        if (sel !== 'front' && !chapter(sel)) sel = 'front';
        if (sel === 'front') {
            el.innerHTML = `<div class="pbb-edit-head"><span class="pbb-label">Front matter</span></div>
<div class="pbb-fields">
  <label class="pbb-field pbb-span2"><span class="pbb-field-label">Title</span><input class="form-input pbb-title-input" data-f="title" maxlength="${LIMITS.short}" value="${esc(b.title)}" placeholder="Book title" autocomplete="off"></label>
  <label class="pbb-field pbb-span2"><span class="pbb-field-label">Subtitle</span><input class="form-input" data-f="subtitle" maxlength="${LIMITS.short}" value="${esc(b.subtitle)}" placeholder="A short line about what the book helps with" autocomplete="off"></label>
  <label class="pbb-field"><span class="pbb-field-label">Author</span><input class="form-input" data-f="author" maxlength="${LIMITS.short}" value="${esc(b.author)}" placeholder="Your name" autocomplete="off"></label>
  <label class="pbb-field"><span class="pbb-field-label">Edition</span><input class="form-input" data-f="edition" maxlength="${LIMITS.short}" value="${esc(b.edition)}" placeholder="First edition" autocomplete="off"></label>
  <label class="pbb-field pbb-span2"><span class="pbb-field-label">Introduction</span><textarea class="form-textarea pbb-auto" data-f="intro" rows="7" placeholder="Say who the book is for and how to use it. Headings, bold, italic and lists work here.">${esc(b.intro)}</textarea></label>
</div>`;
        } else {
            const c = chapter(sel), ci = b.chapters.indexOf(c), n = b.chapters.length;
            const blocks = c.blocks.map((x, i) => editorBlock(x, i, c.blocks.length)).join('');
            el.innerHTML = `<div class="pbb-chap-head">
  <div class="pbb-chap-bar"><span class="pbb-label">Chapter <span class="pbb-mono">${ci + 1}</span></span><span class="pbb-actions">
    ${iconBtn('moveChapter', 'arrow_upward', 'Move chapter up', `data-id="${c.id}" data-dir="-1"`, '', ci === 0)}
    ${iconBtn('moveChapter', 'arrow_downward', 'Move chapter down', `data-id="${c.id}" data-dir="1"`, '', ci === n - 1)}
    ${iconBtn('dupChapter', 'content_copy', 'Duplicate chapter', `data-id="${c.id}"`)}
    ${iconBtn('delChapter', 'delete', 'Remove chapter', `data-id="${c.id}"`, 'danger')}
  </span></div>
  <input class="form-input pbb-chap-title" data-f="title" data-c="${c.id}" maxlength="${LIMITS.short}" value="${esc(c.title)}" placeholder="Chapter title" aria-label="Chapter title" autocomplete="off">
</div>
<div class="pbb-blocks" id="pbb-blocks">${blocks || `<div class="pbb-blank pbb-blank-sm"><p>This chapter is empty. Add guidance, a step list, a callout or a prompt.</p></div>`}</div>
<div class="pbb-add" role="group" aria-label="Add a block">
  <span class="pbb-label">Add</span>
  <button type="button" class="btn" data-act="addBlock" data-type="guidance">${ms('article')}<span>Guidance</span></button>
  <button type="button" class="btn" data-act="addBlock" data-type="steps">${ms('format_list_numbered')}<span>Step list</span></button>
  <button type="button" class="btn" data-act="addBlock" data-type="callout">${ms('lightbulb')}<span>Callout</span></button>
  <button type="button" class="btn" data-act="addBlock" data-type="prompt">${ms('terminal')}<span>Prompt</span></button>
  <button type="button" class="btn btn-accent" data-act="pickLibrary">${ms('library_add')}<span>From library</span></button>
</div>`;
        }
        if (keepScroll !== false) sc.scrollTop = top;
    }
    function editorBlock(x, i, n) {
        const T = TYPES[x.type];
        const head = `<header class="pbb-block-head">
  <button type="button" class="pbb-grip" data-grip data-kb-block="${x.id}" aria-label="Reorder ${T.label} block. Drag, or press Alt with the up and down arrow keys." aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown">${ms('drag_indicator')}</button>
  <span class="pbb-block-type">${ms(T.icon)}<span>${T.label}</span><span class="pbb-mono pbb-block-idx">${i + 1}</span></span>
  <span class="pbb-actions">
    ${iconBtn('moveBlock', 'arrow_upward', 'Move block up', `data-id="${x.id}" data-dir="-1"`, '', i === 0)}
    ${iconBtn('moveBlock', 'arrow_downward', 'Move block down', `data-id="${x.id}" data-dir="1"`, '', i === n - 1)}
    ${iconBtn('dupBlock', 'content_copy', 'Duplicate block', `data-id="${x.id}"`)}
    ${iconBtn('delBlock', 'delete', 'Remove block', `data-id="${x.id}"`, 'danger')}
  </span>
</header>`;
        let body = '';
        if (x.type === 'guidance') {
            const live = mdPreview.has(x.id);
            body = `<div class="pbb-md-bar" role="toolbar" aria-label="Formatting">
  <span class="pbb-md-tools">
    ${live ? '' : `<button type="button" class="icon-btn pbb-sm" data-act="fmt" data-fmt="h" data-id="${x.id}" aria-label="Heading" title="Heading">${ms('title')}</button>
    <button type="button" class="icon-btn pbb-sm" data-act="fmt" data-fmt="b" data-id="${x.id}" aria-label="Bold" title="Bold">${ms('format_bold')}</button>
    <button type="button" class="icon-btn pbb-sm" data-act="fmt" data-fmt="i" data-id="${x.id}" aria-label="Italic" title="Italic">${ms('format_italic')}</button>
    <button type="button" class="icon-btn pbb-sm" data-act="fmt" data-fmt="ul" data-id="${x.id}" aria-label="Bullet list" title="Bullet list">${ms('format_list_bulleted')}</button>
    <button type="button" class="icon-btn pbb-sm" data-act="fmt" data-fmt="ol" data-id="${x.id}" aria-label="Numbered list" title="Numbered list">${ms('format_list_numbered')}</button>`}
  </span>
  <span class="pbb-seg" role="group" aria-label="View"><button type="button" data-act="mdMode" data-id="${x.id}" data-live="0" aria-pressed="${!live}">Write</button><button type="button" data-act="mdMode" data-id="${x.id}" data-live="1" aria-pressed="${live}">Preview</button></span>
</div>
${live ? `<div class="pbb-md-live pbb-prose">${x.text.trim() ? renderMd(x.text, 3) : '<p class="pbb-empty-note">Nothing to preview yet.</p>'}</div>` : `<textarea class="form-textarea pbb-auto" data-f="text" data-b="${x.id}" rows="5" aria-label="Guidance text" placeholder="Write guidance. Use # for headings, **bold**, *italic*, * for bullets and 1. for numbered lists.">${esc(x.text)}</textarea>`}`;
        } else if (x.type === 'steps') {
            body = `<input class="form-input" data-f="title" data-b="${x.id}" maxlength="${LIMITS.short}" value="${esc(x.title)}" placeholder="Step list title (optional)" aria-label="Step list title" autocomplete="off">
<textarea class="form-textarea pbb-auto" data-f="text" data-b="${x.id}" rows="5" aria-label="Steps, one per line" placeholder="One step per line. They are numbered for you.">${esc(x.text)}</textarea>
<p class="pbb-help"><span class="pbb-mono" data-steps-count="${x.id}">${stepItems(x.text).length}</span> steps</p>`;
        } else if (x.type === 'callout') {
            body = `<div class="pbb-seg" role="group" aria-label="Callout kind"><button type="button" data-act="calloutKind" data-id="${x.id}" data-kind="tip" aria-pressed="${x.kind !== 'warning'}">Tip</button><button type="button" data-act="calloutKind" data-id="${x.id}" data-kind="warning" aria-pressed="${x.kind === 'warning'}">Warning</button></div>
<textarea class="form-textarea pbb-auto" data-f="text" data-b="${x.id}" rows="3" aria-label="Callout text" placeholder="Something the reader should notice.">${esc(x.text)}</textarea>`;
        } else {
            const vs = varsIn(x.content);
            body = `<input class="form-input" data-f="title" data-b="${x.id}" maxlength="${LIMITS.short}" value="${esc(x.title)}" placeholder="Prompt title" aria-label="Prompt title" autocomplete="off">
<textarea class="form-textarea pbb-auto pbb-code" data-f="content" data-b="${x.id}" rows="6" aria-label="Prompt text" spellcheck="false" placeholder="Type a prompt, or add one from your library. Variables like [[name]], {{name}} and ((name)) are kept as they are.">${esc(x.content)}</textarea>
<div class="pbb-vars" data-vars="${x.id}">${varsHtml(vs)}</div>
<input class="form-input" data-f="note" data-b="${x.id}" maxlength="2000" value="${esc(x.note)}" placeholder="When to use it (optional)" aria-label="When to use it" autocomplete="off">
<div class="pbb-prompt-foot"><button type="button" class="btn btn-ghost pbb-xs" data-act="replaceLibrary" data-id="${x.id}">${ms('library_books')}<span>Replace from library</span></button>${x.sourceId != null ? `<span class="pbb-chip">${ms('link')}<span>From your library</span></span>` : ''}</div>`;
        }
        return `<article class="pbb-block" data-dk="block" data-did="${x.id}" data-block="${x.id}" data-type="${x.type}">${head}<div class="pbb-block-body">${body}</div></article>`;
    }
    const varsHtml = vs => vs.length ? `<span class="pbb-label">Variables</span>${vs.map(v => `<code class="pbb-var-chip">${esc(v)}</code>`).join('')}` : '';

    // ---------- render: preview and status ----------
    function renderPreview() {
        const b = book(), el = $('#pbb-pv-book');
        el.innerHTML = b ? bookHtml(b, 'pbb-pv-') : '';
    }
    function schedulePreview() { clearTimeout(previewTimer); previewTimer = setTimeout(renderPreview, 140); }
    function renderStatus() {
        const b = book();
        $('#pbb-status').innerHTML = b
            ? `<span class="pbb-st-title">${esc(bookTitle(b))}</span><span class="pbb-st"><b class="pbb-mono">${fmtN(bookWords(b))}</b> words</span><span class="pbb-st"><b class="pbb-mono">${fmtN(b.chapters.length)}</b> ${b.chapters.length === 1 ? 'chapter' : 'chapters'}</span><span class="pbb-st pbb-saved" id="pbb-saved">${dirty ? 'Saving' : 'Saved'}</span>`
            : `<span class="pbb-st-title">No book open</span>`;
    }
    function setSaved(t) { const e = root && root.querySelector('#pbb-saved'); if (e) e.textContent = t; }
    function refresh() { renderRail(); renderOutline(); renderEditor(); renderPreview(); renderStatus(); }
    function refreshLight() { renderRail(); renderOutline(); schedulePreview(); renderStatus(); }
    function setTab(t) {
        tab = t;
        $('#pbb-body').dataset.tab = t;
        root.querySelectorAll('.pbb-tabs [role=tab]').forEach(b => { const on = b.dataset.tab === t; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; });
    }
    function scrollPreviewTo(id) {
        const t = document.getElementById(id);
        const sc = $('#pbb-pv-scroll');
        if (!t || !sc.contains(t) || sc.offsetParent === null) return;
        sc.scrollTo({ top: t.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - 12, behavior: reduceMotion() ? 'auto' : 'smooth' });
    }

    // ---------- dialogs: one at a time, focus trapped, Esc closes ----------
    const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select, [href], [tabindex]:not([tabindex="-1"])';
    function openDialog(html, opts = {}) {
        closeDialog(false, true);
        const layer = $('#pbb-layer');
        layer.innerHTML = `<div class="pbb-scrim" data-scrim><div class="pbb-dialog${opts.wide ? ' pbb-dialog-wide' : ''}" role="${opts.alert ? 'alertdialog' : 'dialog'}" aria-modal="true" aria-labelledby="pbb-dlg-title" tabindex="-1">${html}</div></div>`;
        const op = opts.opener || document.activeElement;
        dialog = { opener: op, openerAct: op && op.dataset ? op.dataset.act : null, resolve: opts.resolve || null, onClose: opts.onClose || null };
        const d = layer.querySelector('.pbb-dialog');
        (d.querySelector('[data-autofocus]') || d).focus();
    }
    function closeDialog(result, silent) {
        if (!dialog) return;
        const d = dialog; dialog = null;
        $('#pbb-layer').innerHTML = '';
        if (d.onClose) d.onClose();
        if (d.resolve) d.resolve(result === true);
        if (silent) return;
        if (d.opener && d.opener.isConnected && root.contains(d.opener)) d.opener.focus();
        else if (!(d.openerAct && focusSel(`[data-act="${d.openerAct}"]`))) root.focus();
    }
    function confirmDialog(title, body, okLabel) {
        return new Promise(resolve => openDialog(`<h3 class="pbb-dlg-title" id="pbb-dlg-title">${esc(title)}</h3><p class="pbb-dlg-body">${esc(body)}</p><div class="pbb-dlg-foot"><button type="button" class="btn" data-act="dlgCancel" data-autofocus>Cancel</button><button type="button" class="btn btn-danger" data-act="dlgOk">${esc(okLabel)}</button></div>`, { alert: true, resolve }));
    }

    // ---------- library picker over the read only prompt list ----------
    function libFilter() {
        const q = lib.q.trim().toLowerCase();
        const items = lib.items || [];
        if (!q) return items;
        const toks = q.split(/\s+/);
        return items.filter(p => { const hay = [p.title, p.description, p.content, (p.tags || []).join(' ')].join(' ').toLowerCase(); return toks.every(t => hay.includes(t)); });
    }
    function renderLibList() {
        const el = root.querySelector('#pbb-lib-list');
        if (!el) return;
        const foot = root.querySelector('#pbb-lib-count');
        if (lib.loading && !lib.items) { el.innerHTML = `<p class="pbb-empty">Loading your library.</p>`; return; }
        if (lib.error && !lib.items) { el.innerHTML = `<p class="pbb-empty">Your library could not be loaded. You can still type a prompt directly.</p>`; return; }
        const keepId = document.activeElement && el.contains(document.activeElement) ? document.activeElement.dataset.id : null;
        const all = libFilter(), shown = all.slice(0, 100);
        if (foot) foot.textContent = `${fmtN(all.length)} of ${fmtN((lib.items || []).length)}`;
        if (!all.length) { el.innerHTML = `<p class="pbb-empty">${(lib.items || []).length ? 'No prompts match that search.' : 'Your library has no prompts yet.'}</p>`; return; }
        el.innerHTML = shown.map(p => {
            const added = lib.mode === 'add' && lib.added.has(p.id);
            const snip = (p.description || p.content || '').replace(/\s+/g, ' ').trim().slice(0, 140);
            const tags = (p.tags || []).slice(0, 3).map(t => `<span class="pbb-chip">${esc(t)}</span>`).join('');
            return `<button type="button" class="pbb-lib-item${added ? ' is-added' : ''}" data-act="libPick" data-id="${esc(p.id)}"><span class="pbb-lib-main"><span class="pbb-lib-title">${esc(p.title || 'Untitled')}</span><span class="pbb-lib-snip">${esc(snip)}</span>${tags ? `<span class="pbb-lib-tags">${tags}</span>` : ''}</span><span class="pbb-lib-cta">${added ? `${ms('check')}<span>Added</span>` : `${ms(lib.mode === 'add' ? 'add' : 'swap_horiz')}<span>${lib.mode === 'add' ? 'Add' : 'Use'}</span>`}</span></button>`;
        }).join('') + (all.length > shown.length ? `<p class="pbb-empty">Showing the first ${shown.length}. Search to narrow the list.</p>` : '');
        if (keepId != null) { const again = [...el.querySelectorAll('[data-id]')].find(n => n.dataset.id === keepId); if (again) again.focus({ preventScroll: true }); }
    }
    async function loadLibrary() {
        lib.loading = true; lib.error = false;
        renderLibList();
        try {
            const r = await fetch('/api/prompts');
            if (!r.ok) throw new Error('bad status');
            const data = await r.json();
            lib.items = Array.isArray(data) ? data.filter(p => p && p.id != null) : [];
        } catch (e) { lib.error = true; }
        lib.loading = false;
        renderLibList();
    }
    function openLibrary(mode, replaceId) {
        lib.mode = mode; lib.replaceId = replaceId || null; lib.q = ''; lib.added = new Set();
        openDialog(`<div class="pbb-dlg-head"><h3 class="pbb-dlg-title" id="pbb-dlg-title">${mode === 'add' ? 'Add prompts from your library' : 'Replace from your library'}</h3><button type="button" class="icon-btn" data-act="dlgCancel" aria-label="Close">${ms('close')}</button></div>
<input type="search" class="form-input pbb-lib-search" id="pbb-lib-q" placeholder="Search by title, tag or text" aria-label="Search your library" autocomplete="off" data-autofocus>
<div class="pbb-lib-list" id="pbb-lib-list"></div>
<div class="pbb-dlg-foot"><span class="pbb-mono pbb-count" id="pbb-lib-count"></span><button type="button" class="btn btn-accent" data-act="libDone">Done</button></div>`, { wide: true });
        renderLibList();
        loadLibrary();
    }
    function libPick(id) {
        const p = (lib.items || []).find(x => String(x.id) === String(id));
        const c = curChapter();
        if (!p || !c) return;
        if (lib.mode === 'replace') {
            const f = findBlock(lib.replaceId);
            if (f && f.block.type === 'prompt') {
                f.block.title = f.block.title.trim() ? f.block.title : str(p.title, LIMITS.short);
                f.block.content = str(p.content); f.block.sourceId = Number(p.id);
                touch(true);
                closeDialog(true); refresh();
                gotoBlock(f.block.id);
                toast('Prompt replaced from your library', 'success');
            }
            return;
        }
        const blk = newBlock('prompt', { title: str(p.title, LIMITS.short), content: str(p.content), sourceId: Number(p.id) });
        c.blocks.push(blk);
        lib.added.add(p.id);
        lastAdded = blk.id;
        touch(true);
        renderEditor(); renderOutline(); renderPreview(); renderStatus(); renderRail();
        renderLibList();
    }
    let lastAdded = null;

    // ---------- structure actions ----------
    function move(arr, from, to) { const [x] = arr.splice(from, 1); arr.splice(to, 0, x); }
    function after(fn) { touch(true); refresh(); if (fn) fn(); }
    function focusSel(selector) { const e = root.querySelector(selector); if (e) { e.focus(); return true; } return false; }
    function gotoBlock(id) {
        const e = root.querySelector(`[data-block="${id}"]`);
        if (!e) return;
        e.scrollIntoView({ block: 'nearest', behavior: reduceMotion() ? 'auto' : 'smooth' });
        e.classList.add('is-flash'); setTimeout(() => e.classList.remove('is-flash'), 900);
        const f = e.querySelector('textarea, input'); if (f) f.focus({ preventScroll: true });
    }
    function selectChapter(id, opts = {}) {
        sel = id;
        renderOutline(); renderEditor(false);
        $('#pbb-editor-scroll').scrollTop = 0;
        const b = book();
        const i = b ? b.chapters.findIndex(c => c.id === id) : -1;
        scrollPreviewTo(i >= 0 ? `pbb-pv-ch-${i + 1}` : 'pbb-pv-cover');
        if (narrow() && !opts.stay) setTab('write');
    }
    function moveChapter(id, dir, focusOutline) {
        const b = book(); if (!b) return;
        const i = b.chapters.findIndex(c => c.id === id), j = i + dir;
        if (i < 0 || j < 0 || j >= b.chapters.length) return;
        move(b.chapters, i, j);
        after(() => focusSel(focusOutline ? `[data-kb-chapter="${id}"]` : `[data-act="moveChapter"][data-id="${id}"][data-dir="${dir}"]:not([disabled])`) || focusSel(`[data-act="moveChapter"][data-id="${id}"]:not([disabled])`));
    }
    function moveBlock(id, dir, focusGrip) {
        const f = findBlock(id); if (!f) return;
        const arr = f.chapter.blocks, i = arr.indexOf(f.block), j = i + dir;
        if (j < 0 || j >= arr.length) return;
        move(arr, i, j);
        after(() => { if (focusGrip) focusSel(`[data-kb-block="${id}"]`); else focusSel(`[data-block="${id}"] [data-act="moveBlock"][data-dir="${dir}"]:not([disabled])`) || focusSel(`[data-block="${id}"] [data-kb-block]`); });
    }
    async function removeChapter(id) {
        const b = book(), c = chapter(id); if (!c) return;
        const empty = !c.title.trim() && !c.blocks.length;
        if (!empty && !(await confirmDialog('Remove this chapter?', `"${chapterLabel(c)}" and its ${c.blocks.length} ${c.blocks.length === 1 ? 'block' : 'blocks'} will be removed from this book.`, 'Remove chapter'))) return;
        const i = b.chapters.indexOf(c);
        b.chapters.splice(i, 1);
        sel = b.chapters.length ? b.chapters[Math.min(i, b.chapters.length - 1)].id : 'front';
        after(() => focusSel('[data-act="addChapter"]'));
    }
    async function removeBlock(id) {
        const f = findBlock(id); if (!f) return;
        const x = f.block;
        const empty = !blockText(x).trim();
        if (!empty && !(await confirmDialog('Remove this block?', `This ${TYPES[x.type].label.toLowerCase()} block will be removed from the chapter.`, 'Remove block'))) return;
        const arr = f.chapter.blocks, i = arr.indexOf(x);
        arr.splice(i, 1);
        mdPreview.delete(id);
        after(() => { const n = arr[Math.min(i, arr.length - 1)]; if (!(n && focusSel(`[data-block="${n.id}"] [data-kb-block]`))) focusSel('[data-act="addBlock"]'); });
    }
    function addBlock(type) {
        const c = curChapter(); if (!c) return;
        if (c.blocks.length >= LIMITS.blocks) return toast('A chapter can hold up to 200 blocks', 'warning');
        const blk = newBlock(type);
        c.blocks.push(blk);
        touch(true);
        renderEditor(); renderOutline(); renderPreview(); renderStatus();
        gotoBlock(blk.id);
    }
    function addChapter() {
        const b = book(); if (!b) return;
        if (b.chapters.length >= LIMITS.chapters) return toast('A book can hold up to 200 chapters', 'warning');
        const c = { id: uid('c'), title: '', blocks: [] };
        b.chapters.push(c);
        sel = c.id;
        touch(true);
        refresh();
        scrollPreviewTo(`pbb-pv-ch-${b.chapters.length}`);
        if (narrow()) setTab('write');
        focusSel('.pbb-chap-title');
    }
    function newBookAction() {
        if (store.books.length >= LIMITS.books) return toast('You can keep up to 100 books', 'warning');
        const nb = newBook();
        store.books.unshift(nb); store.active = nb.id; sel = 'front'; renaming = null;
        touch(true); writeStore();
        refresh();
        if (narrow()) setTab('write');
        focusSel('.pbb-title-input');
    }
    function selectBook(id) {
        if (!store.books.some(b => b.id === id)) return;
        store.active = id; sel = 'front'; renaming = null; dirty = true; touchSoon();
        refresh();
        $('#pbb-pv-scroll').scrollTop = 0;
        if (narrow()) setTab('outline');
    }
    function touchSoon() { clearTimeout(saveTimer); saveTimer = setTimeout(writeStore, 200); }
    function commitRename(id, value, cancel, refocus) {
        if (renaming !== id) return;
        renaming = null;
        const b = store.books.find(k => k.id === id);
        if (b && !cancel) {
            b.title = str(value, LIMITS.short).trim() || b.title;
            dirty = true; touchSoon();
            const ti = root.querySelector('.pbb-title-input');
            if (ti && id === store.active && sel === 'front') ti.value = b.title;
        }
        renderRail(); renderStatus(); schedulePreview();
        if (refocus) focusSel(`[data-act="renameBook"][data-id="${id}"]`);
    }
    async function deleteBook(id) {
        const b = store.books.find(k => k.id === id); if (!b) return;
        if (!(await confirmDialog('Delete this book?', `"${bookTitle(b)}" will be removed from this device. Export a JSON backup first if you might want it back.`, 'Delete book'))) return;
        const i = store.books.indexOf(b);
        store.books.splice(i, 1);
        if (store.active === id) { store.active = store.books[0] ? store.books[0].id : null; sel = 'front'; }
        dirty = true; writeStore();
        refresh();
        toast('Book deleted', 'success');
    }
    function importBookFile(file) {
        if (!file) return;
        if (file.size > 12 * 1024 * 1024) return toast('That file is too large to import', 'error');
        const rd = new FileReader();
        rd.onerror = () => toast('Could not read that file', 'error');
        rd.onload = () => {
            try {
                const nb = parseImport(String(rd.result || ''));
                if (store.books.length >= LIMITS.books) throw new Error('You can keep up to 100 books.');
                store.books.unshift(nb); store.active = nb.id; sel = 'front'; renaming = null;
                dirty = true; writeStore();
                refresh();
                if (narrow()) setTab('outline');
                toast(`Imported "${bookTitle(nb)}"`, 'success');
            } catch (e) { toast(e.message || 'Could not import that file', 'error'); }
        };
        rd.readAsText(file);
    }
    function doExport(kind) {
        const b = book(); if (!b) return toast('Open a book first', 'warning');
        const base = slug(bookTitle(b)) || 'prompt-book';
        if (kind === 'md') download(base + '.md', 'text/markdown;charset=utf-8', buildMarkdown(b));
        else if (kind === 'html') download(base + '.html', 'text/html;charset=utf-8', buildHtmlDoc(b));
        else download(base + '.json', 'application/json;charset=utf-8', buildJson(b));
        toggleExport(false);
        toast('Export ready', 'success');
    }
    function toggleExport(open) {
        const list = $('#pbb-export-list'), btn = $('#pbb-export-btn');
        const on = typeof open === 'boolean' ? open : list.hidden;
        list.hidden = !on;
        btn.setAttribute('aria-expanded', String(on));
        if (on) { const f = list.querySelector('button'); if (f) f.focus(); }
    }

    // ---------- guidance formatting toolbar ----------
    function applyFmt(id, kind) {
        const f = findBlock(id); if (!f) return;
        const ta = root.querySelector(`textarea[data-b="${id}"][data-f="text"]`); if (!ta) return;
        const v = ta.value;
        let s = ta.selectionStart, e = ta.selectionEnd, out = v, ns = s, ne = e;
        if (kind === 'b' || kind === 'i') {
            const mk = kind === 'b' ? '**' : '*';
            const sel0 = v.slice(s, e) || (kind === 'b' ? 'bold text' : 'italic text');
            out = v.slice(0, s) + mk + sel0 + mk + v.slice(e);
            ns = s + mk.length; ne = ns + sel0.length;
        } else {
            const ls = v.lastIndexOf('\n', s - 1) + 1;
            let le = v.indexOf('\n', e); if (le < 0) le = v.length;
            const lines = v.slice(ls, le).split('\n');
            let mapped;
            if (kind === 'h') mapped = lines.map(l => /^#{1,3}\s/.test(l) ? l.replace(/^#{1,3}\s+/, '') : '## ' + l);
            else if (kind === 'ul') mapped = lines.map(l => /^\s*[*\-+]\s/.test(l) ? l.replace(/^\s*[*\-+]\s+/, '') : '* ' + l);
            else mapped = lines.map((l, i) => /^\s*\d+[.)]\s/.test(l) ? l.replace(/^\s*\d+[.)]\s+/, '') : `${i + 1}. ${l}`);
            const seg = mapped.join('\n');
            out = v.slice(0, ls) + seg + v.slice(le);
            ns = ls; ne = ls + seg.length;
        }
        ta.value = out; ta.focus(); ta.setSelectionRange(ns, ne);
        f.block.text = out; touch(); refreshLight();
    }

    // ---------- events ----------
    const actions = {
        close: () => closeWorkspace(),
        toggleExport: () => toggleExport(),
        export: t => doExport(t.dataset.kind),
        newBook: () => newBookAction(),
        importBook: () => $('#pbb-import-file').click(),
        selBook: t => selectBook(t.dataset.id),
        renameBook: t => { renaming = t.dataset.id; renderRail(); },
        delBook: t => deleteBook(t.dataset.id),
        selFront: () => { sel = 'front'; renderOutline(); renderEditor(false); $('#pbb-editor-scroll').scrollTop = 0; scrollPreviewTo('pbb-pv-cover'); if (narrow()) setTab('write'); },
        selChapter: t => selectChapter(t.dataset.id),
        addChapter: () => addChapter(),
        moveChapter: t => moveChapter(t.dataset.id, +t.dataset.dir),
        dupChapter: t => {
            const b = book(), c = chapter(t.dataset.id); if (!c) return;
            if (b.chapters.length >= LIMITS.chapters) return toast('A book can hold up to 200 chapters', 'warning');
            const nc = cloneChapter(c); nc.title = c.title.trim() ? c.title + ' copy' : '';
            b.chapters.splice(b.chapters.indexOf(c) + 1, 0, nc); sel = nc.id;
            after(() => focusSel('.pbb-chap-title'));
        },
        delChapter: t => removeChapter(t.dataset.id),
        addBlock: t => addBlock(t.dataset.type),
        pickLibrary: () => { if (curChapter()) openLibrary('add'); },
        replaceLibrary: t => openLibrary('replace', t.dataset.id),
        moveBlock: t => moveBlock(t.dataset.id, +t.dataset.dir),
        dupBlock: t => {
            const f = findBlock(t.dataset.id); if (!f) return;
            if (f.chapter.blocks.length >= LIMITS.blocks) return toast('A chapter can hold up to 200 blocks', 'warning');
            const copy = { ...f.block, id: uid('b') };
            f.chapter.blocks.splice(f.chapter.blocks.indexOf(f.block) + 1, 0, copy);
            after(() => gotoBlock(copy.id));
        },
        delBlock: t => removeBlock(t.dataset.id),
        gotoBlock: t => gotoBlock(t.dataset.id),
        fmt: t => applyFmt(t.dataset.id, t.dataset.fmt),
        mdMode: t => { if (t.dataset.live === '1') mdPreview.add(t.dataset.id); else mdPreview.delete(t.dataset.id); renderEditor(); focusSel(`[data-act="mdMode"][data-id="${t.dataset.id}"][data-live="${t.dataset.live}"]`); },
        calloutKind: t => { const f = findBlock(t.dataset.id); if (!f) return; f.block.kind = t.dataset.kind; touch(); renderEditor(); renderOutline(); schedulePreview(); focusSel(`[data-act="calloutKind"][data-id="${t.dataset.id}"][data-kind="${t.dataset.kind}"]`); },
        tab: t => setTab(t.dataset.tab),
        copy: t => { const pre = t.closest('figure') && t.closest('figure').querySelector('pre'); if (pre) copyText(pre.textContent, t); },
        dlgCancel: () => closeDialog(false),
        dlgOk: () => closeDialog(true),
        libPick: t => libPick(t.dataset.id),
        libDone: () => { const id = lastAdded; const had = lib.added.size > 0; closeDialog(true); lastAdded = null; if (had && id) gotoBlock(id); },
    };

    function onInput(e) {
        const t = e.target;
        if (t.id === 'pbb-lib-q') { lib.q = t.value; renderLibList(); return; }
        if (t.dataset.rename) return;
        const f = t.dataset.f; if (!f) return;
        const val = str(t.value, f === 'content' || f === 'text' || f === 'intro' ? LIMITS.text : LIMITS.short);
        if (t.dataset.b) {
            const x = findBlock(t.dataset.b); if (!x) return;
            x.block[f] = f === 'note' ? val.slice(0, 2000) : val;
            if (f === 'content') { const v = root.querySelector(`[data-vars="${t.dataset.b}"]`); if (v) v.innerHTML = varsHtml(varsIn(val)); }
            if (f === 'text' && x.block.type === 'steps') { const n = root.querySelector(`[data-steps-count="${t.dataset.b}"]`); if (n) n.textContent = String(stepItems(val).length); }
            if (f === 'content' && x.block.sourceId != null) { /* edits keep the link note but the text is the book's own copy */ }
        } else if (t.dataset.c) {
            const c = chapter(t.dataset.c); if (!c) return;
            c[f] = val;
        } else {
            const b = book(); if (!b) return;
            b[f] = val;
        }
        touch();
        refreshLight();
    }

    function onClick(e) {
        const t = e.target;
        if (t.hasAttribute && t.hasAttribute('data-scrim') && dialog) { closeDialog(false); return; }
        const jump = t.closest('a[data-jump]');
        if (jump) { e.preventDefault(); scrollPreviewTo(jump.getAttribute('href').slice(1)); return; }
        const copyBtn = t.closest('.pbb-copy');
        if (copyBtn) { actions.copy(copyBtn); return; }
        const a = t.closest('[data-act]');
        if (a && root.contains(a)) {
            const fn = actions[a.dataset.act];
            if (fn) { fn(a); }
        }
        if (!t.closest('.pbb-menu')) { const l = $('#pbb-export-list'); if (l && !l.hidden) toggleExport(false); }
    }

    function onKeydown(e) {
        // Dialog first: Esc closes it, Tab stays inside it.
        if (dialog) {
            if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeDialog(false); return; }
            if (e.key === 'Tab') {
                const d = root.querySelector('.pbb-dialog');
                const items = [...d.querySelectorAll(FOCUSABLE)].filter(n => n.offsetParent !== null);
                if (!items.length) { e.preventDefault(); d.focus(); return; }
                const first = items[0], last = items[items.length - 1];
                if (e.shiftKey && (document.activeElement === first || document.activeElement === d)) { e.preventDefault(); last.focus(); }
                else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
            return;
        }
        const t = e.target;
        if (e.key === 'Escape') {
            const l = $('#pbb-export-list');
            if (l && !l.hidden) { e.preventDefault(); toggleExport(false); $('#pbb-export-btn').focus(); }
            else if (t.dataset && t.dataset.rename) { e.preventDefault(); commitRename(t.dataset.rename, '', true, true); }
            return;
        }
        if (t.dataset && t.dataset.rename && e.key === 'Enter') { e.preventDefault(); commitRename(t.dataset.rename, t.value, false, true); return; }
        if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
            const dir = e.key === 'ArrowUp' ? -1 : 1;
            if (t.dataset && t.dataset.kbChapter) { e.preventDefault(); moveChapter(t.dataset.kbChapter, dir, true); }
            else if (t.dataset && t.dataset.kbBlock) { e.preventDefault(); moveBlock(t.dataset.kbBlock, dir, true); }
            return;
        }
        if ((e.ctrlKey || e.metaKey) && !e.altKey && t.tagName === 'TEXTAREA' && t.dataset.b && t.dataset.f === 'text' && (e.key === 'b' || e.key === 'i')) {
            const f = findBlock(t.dataset.b);
            if (f && f.block.type === 'guidance') { e.preventDefault(); applyFmt(t.dataset.b, e.key); }
        }
        if (e.key === 'Escape' || !t.closest) return;
        const tabBtn = t.closest('.pbb-tabs [role=tab]');
        if (tabBtn && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
            const tabs = [...root.querySelectorAll('.pbb-tabs [role=tab]')], i = tabs.indexOf(tabBtn);
            const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
            setTab(n.dataset.tab); n.focus(); e.preventDefault();
        }
    }
    function onFocusOut(e) {
        const t = e.target;
        if (t.dataset && t.dataset.rename) commitRename(t.dataset.rename, t.value, false, false);
    }

    // ---------- drag and drop for chapters and blocks ----------
    function dropSide(el, e) { const r = el.getBoundingClientRect(); return e.clientY < r.top + r.height / 2 ? 'before' : 'after'; }
    function clearDrop() { root.querySelectorAll('.pbb-drop-before, .pbb-drop-after, .is-dragging').forEach(n => n.classList.remove('pbb-drop-before', 'pbb-drop-after', 'is-dragging')); }
    function wireDrag() {
        root.addEventListener('pointerdown', e => {
            const g = e.target.closest('[data-grip]');
            if (!g) return;
            const host = g.closest('[data-dk]');
            if (host) host.draggable = true;
        });
        const reset = () => root.querySelectorAll('[data-dk][draggable="true"]').forEach(n => { n.draggable = false; });
        root.addEventListener('pointerup', reset);
        root.addEventListener('pointercancel', reset);
        root.addEventListener('dragstart', e => {
            const h = e.target.closest && e.target.closest('[data-dk]');
            if (!h || !h.draggable) return;
            dragKind = h.dataset.dk; dragId = h.dataset.did;
            e.dataTransfer.effectAllowed = 'move';
            try { e.dataTransfer.setData('text/plain', dragId); } catch (_) { /* ignore */ }
            h.classList.add('is-dragging');
        });
        root.addEventListener('dragover', e => {
            if (!dragKind) return;
            const h = e.target.closest && e.target.closest(`[data-dk="${dragKind}"]`);
            if (!h || h.dataset.did === dragId) return;
            e.preventDefault(); e.dataTransfer.dropEffect = 'move';
            root.querySelectorAll('.pbb-drop-before, .pbb-drop-after').forEach(n => n.classList.remove('pbb-drop-before', 'pbb-drop-after'));
            h.classList.add('pbb-drop-' + dropSide(h, e));
        });
        root.addEventListener('drop', e => {
            if (!dragKind) return;
            const h = e.target.closest && e.target.closest(`[data-dk="${dragKind}"]`);
            if (!h || h.dataset.did === dragId) return;
            e.preventDefault();
            const side = dropSide(h, e), kind = dragKind, id = dragId, tid = h.dataset.did;
            dragKind = null; dragId = null; clearDrop();
            let arr = null;
            if (kind === 'chapter') arr = book().chapters;
            else { const f = findBlock(id); arr = f ? f.chapter.blocks : null; }
            if (!arr) return;
            const from = arr.findIndex(x => x.id === id), toRaw = arr.findIndex(x => x.id === tid);
            if (from < 0 || toRaw < 0) return;
            let to = toRaw + (side === 'after' ? 1 : 0);
            if (from < to) to--;
            if (to !== from) { move(arr, from, to); after(() => focusSel(kind === 'chapter' ? `[data-kb-chapter="${id}"]` : `[data-kb-block="${id}"]`)); }
        });
        root.addEventListener('dragend', () => { dragKind = null; dragId = null; clearDrop(); reset(); });
    }

    // ---------- mount, open, close ----------
    function ensureRoot() {
        let el = document.getElementById(ROOT_ID);
        if (!el && document.body) {
            el = document.createElement('div');
            el.id = ROOT_ID;
            document.body.appendChild(el);
        }
        return el;
    }
    function mount() {
        root = ensureRoot();
        if (!root) return false;
        if (mounted) return true;
        root.setAttribute('tabindex', '-1');
        root.setAttribute('role', 'region');
        root.setAttribute('aria-label', 'Prompt Book Builder');
        root.innerHTML = MARKUP;
        store = loadStore();
        if (!store.books.length) { const nb = newBook(); store.books.push(nb); store.active = nb.id; dirty = true; writeStore(); }
        root.addEventListener('click', onClick);
        root.addEventListener('input', onInput);
        root.addEventListener('keydown', onKeydown);
        root.addEventListener('focusout', onFocusOut);
        root.addEventListener('change', e => { if (e.target.id === 'pbb-import-file') { importBookFile(e.target.files[0]); e.target.value = ''; } });
        wireDrag();
        window.addEventListener('pagehide', () => { if (dirty) writeStore(); });
        mounted = true;
        return true;
    }
    function openWorkspace() {
        if (!document.body.classList.contains('is-premium')) return toast('Prompt Book Builder is a Pro feature', 'warning');
        if (!mount()) return;
        opener = document.activeElement;
        root.classList.add('open');
        document.querySelectorAll('.nav-item[data-view]').forEach(el => el.classList.remove('active'));
        setTab(tab);
        refresh();
        root.focus();
    }
    function closeWorkspace() {
        if (!root) return;
        closeDialog(false, true);
        toggleExport(false);
        if (dirty) writeStore();
        root.classList.remove('open');
        document.querySelectorAll('.nav-item[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === 'library'));
        if (opener && opener.isConnected && opener.focus) opener.focus();
        opener = null;
    }

    window.openPromptBookBuilderWorkspace = openWorkspace;
    window.PL_closePromptBookBuilder = closeWorkspace;
    // Test hook, read only view of the state.
    Object.defineProperty(window, '__pbb', { configurable: true, get: () => ({ store, sel, buildMarkdown, buildHtmlDoc, buildJson, parseImport, renderMd, bookWords }) });

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensureRoot);
    else ensureRoot();
})();
