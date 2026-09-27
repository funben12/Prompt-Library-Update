/* ============================================================================
   LOCAL API SHIM — mobile build only.
   Replaces the Flask/SQLite backend with an IndexedDB-backed data layer.
   Intercepts window.fetch for any /api/* URL and routes it to a handler
   below, returning a real Response so app.js's api() wrapper (fetch, .ok,
   .json(), status codes) needs zero changes. Non-/api requests (fonts, LLM
   providers) pass through to the real fetch with a timeout guard so a
   dropped connection can never hang the UI.
   Loaded before app.js. Never touches static/app.js or static/index.html —
   this file and this fetch patch exist only in mobile/www/.
   ============================================================================ */
(function () {
    'use strict';

    var DB_NAME = 'PromptLibraryMobile';
    var DB_VERSION = 1;
    var STORES = [
        'folders', 'prompts', 'prompt_versions', 'variable_templates', 'usage_log',
        'taxonomy_domains', 'taxonomy_use_cases', 'prompt_taxonomy', 'prompt_relationships',
        'roles', 'boards', 'board_pins', 'chains'
    ];

    /* ---------------------------------------------------------------------
       IndexedDB plumbing
       --------------------------------------------------------------------- */
    function reqToPromise(req) {
        return new Promise(function (resolve, reject) {
            req.onsuccess = function () { resolve(req.result); };
            req.onerror = function () { reject(req.error); };
        });
    }

    var _dbPromise = null;
    function openDB() {
        if (_dbPromise) return _dbPromise;
        _dbPromise = new Promise(function (resolve, reject) {
            var req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = function (e) {
                var db = e.target.result;
                STORES.forEach(function (name) {
                    if (!db.objectStoreNames.contains(name)) {
                        db.createObjectStore(name, { keyPath: 'id', autoIncrement: true });
                    }
                });
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
            req.onsuccess = function () { resolve(req.result); };
            req.onerror = function () { reject(req.error); };
        });
        return _dbPromise;
    }

    async function getAll(store) {
        var db = await openDB();
        return reqToPromise(db.transaction(store, 'readonly').objectStore(store).getAll());
    }
    async function getOne(store, id) {
        var db = await openDB();
        return reqToPromise(db.transaction(store, 'readonly').objectStore(store).get(id));
    }
    async function putOne(store, obj) {
        var db = await openDB();
        return reqToPromise(db.transaction(store, 'readwrite').objectStore(store).put(obj));
    }
    async function addOne(store, obj) {
        var db = await openDB();
        var id = await reqToPromise(db.transaction(store, 'readwrite').objectStore(store).add(obj));
        obj.id = id;
        return obj;
    }
    async function deleteOne(store, id) {
        var db = await openDB();
        return reqToPromise(db.transaction(store, 'readwrite').objectStore(store).delete(id));
    }
    async function clearStore(store) {
        var db = await openDB();
        return reqToPromise(db.transaction(store, 'readwrite').objectStore(store).clear());
    }

    async function getSetting(key) {
        var row = await getOne('settings', key);
        return row ? row.value : null;
    }
    async function setSetting(key, value) {
        await putOne('settings', { key: key, value: value });
    }
    async function deleteSetting(key) {
        await deleteOne('settings', key);
    }

    function nowIso() { return new Date().toISOString(); }

    /* ---------------------------------------------------------------------
       Seed data — mirrors init_db()'s default taxonomy seed in app.py
       --------------------------------------------------------------------- */
    async function seedIfEmpty() {
        var domains = await getAll('taxonomy_domains');
        if (domains.length) return;
        var seed = {
            'Marketing': ['Email', 'Social Media', 'Copywriting', 'Campaign', 'SEO', 'Ads'],
            'Engineering': ['Code Review', 'Documentation', 'Debugging', 'Architecture', 'Testing'],
            'Operations': ['Process', 'Planning', 'Analysis', 'Reporting', 'Training'],
            'Creative': ['Writing', 'Brainstorming', 'Ideation', 'Storytelling', 'Design Briefs'],
            'Research': ['Summarisation', 'Analysis', 'Comparison', 'Literature Review', 'Q&A'],
            'Sales': ['Outreach', 'Follow-Up', 'Objection Handling', 'Proposal', 'Discovery'],
            'Personal': ['Productivity', 'Learning', 'Reflection', 'Planning', 'Communication']
        };
        for (var domainName in seed) {
            var domain = await addOne('taxonomy_domains', { name: domainName });
            for (var i = 0; i < seed[domainName].length; i++) {
                await addOne('taxonomy_use_cases', { domain_id: domain.id, name: seed[domainName][i] });
            }
        }
    }
    var _seedPromise = seedIfEmpty();

    /* ---------------------------------------------------------------------
       Shared helpers — JS equivalents of app.py's normalisation functions
       --------------------------------------------------------------------- */
    function normaliseList(value) {
        if (value == null) return [];
        var items;
        if (Array.isArray(value)) {
            items = value;
        } else if (typeof value === 'string') {
            var raw = value.trim();
            if (!raw) return [];
            if (raw.startsWith('[')) {
                try {
                    var parsed = JSON.parse(raw);
                    items = Array.isArray(parsed) ? parsed : raw.split(',');
                } catch (e) {
                    items = raw.split(',');
                }
            } else {
                items = raw.split(',');
            }
        } else {
            items = [value];
        }
        var cleaned = [], seen = {};
        items.forEach(function (item) {
            var text = String(item).trim();
            var key = text.toLowerCase();
            if (text && !seen[key]) { cleaned.push(text); seen[key] = true; }
        });
        return cleaned;
    }
    function listForDb(value) { return normaliseList(value).join(','); }
    function jsonValue(value, dflt) {
        if (value == null || value === '') return dflt;
        if (Array.isArray(value) || typeof value === 'object') return value;
        if (typeof value === 'string') {
            try {
                var parsed = JSON.parse(value);
                if (Array.isArray(dflt) && Array.isArray(parsed)) return parsed;
                if (typeof dflt === 'object' && !Array.isArray(dflt) && parsed && typeof parsed === 'object') return parsed;
            } catch (e) { /* fall through */ }
        }
        return dflt;
    }
    function intBetween(value, low, high, dflt) {
        var n = parseInt(value, 10);
        if (isNaN(n)) n = dflt || 0;
        return Math.max(low, Math.min(high, n));
    }
    function folderIdOf(value) {
        if (value === '' || value == null) return null;
        var n = parseInt(value, 10);
        return isNaN(n) ? null : n;
    }
    function idOrNull(value) {
        if (value === '' || value == null || value === 'null') return null;
        var n = parseInt(value, 10);
        return isNaN(n) ? null : n;
    }
    function jsonResponse(body, status) {
        if (status === 204) return new Response(null, { status: 204 });
        return new Response(JSON.stringify(body), {
            status: status || 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    function errorResponse(message, status) {
        return jsonResponse({ error: message }, status || 400);
    }

    /* ---------------------------------------------------------------------
       Prompts — payload shaping + serialisation, mirrors _prompt_payload /
       serialize_prompt in app.py
       --------------------------------------------------------------------- */
    function promptPayload(data) {
        return {
            title: (data.title || 'Untitled').trim() || 'Untitled',
            description: data.description || '',
            content: data.content || '',
            categories: listForDb(data.categories || ''),
            tags: listForDb(data.tags || ''),
            folder_id: folderIdOf(data.folder_id),
            colour_label: data.colour_label || '',
            rating: intBetween(data.rating || 0, 0, 5),
            notes: data.notes || '',
            chain_ids: JSON.stringify(jsonValue(data.chain_ids, [])),
            variable_meta: JSON.stringify(jsonValue(data.variable_meta, {})),
            chat_turns: JSON.stringify(jsonValue(data.chat_turns, [])),
            role_id: idOrNull(data.role_id),
            status: data.status || 'active',
            parent_id: idOrNull(data.parent_id),
            prompt_domain: data.prompt_domain || '',
            prompt_use_case: data.prompt_use_case || '',
            prompt_output_format: data.prompt_output_format || '',
            prompt_tone: data.prompt_tone || ''
        };
    }
    function serializePrompt(row) {
        var p = Object.assign({}, row);
        p.description = p.description || '';
        p.categories = normaliseList(p.categories || '');
        p.tags = normaliseList(p.tags || '');
        p.colour_label = p.colour_label || '';
        p.rating = p.rating || 0;
        p.notes = p.notes || '';
        p.chain_ids = jsonValue(p.chain_ids, []);
        p.variable_meta = jsonValue(p.variable_meta, {});
        p.chat_turns = jsonValue(p.chat_turns, []);
        if (p.folder_id === undefined) p.folder_id = null;
        if (p.is_favorite === undefined) p.is_favorite = 0;
        if (p.use_count === undefined) p.use_count = 0;
        if (p.role_id === undefined) p.role_id = null;
        if (p.status === undefined) p.status = 'active';
        if (p.parent_id === undefined) p.parent_id = null;
        if (p.prompt_domain === undefined) p.prompt_domain = '';
        if (p.prompt_use_case === undefined) p.prompt_use_case = '';
        if (p.prompt_output_format === undefined) p.prompt_output_format = '';
        if (p.prompt_tone === undefined) p.prompt_tone = '';
        return p;
    }

    async function lockedPromptIds() {
        var raw = await getSetting('locked_prompt_ids');
        try {
            var ids = raw ? JSON.parse(raw) : [];
            return Array.isArray(ids) ? ids.map(Number) : [];
        } catch (e) { return []; }
    }
    async function saveLockedPromptIds(ids) {
        await setSetting('locked_prompt_ids', JSON.stringify(ids.slice().sort(function (a, b) { return a - b; })));
    }

    /* ---------------------------------------------------------------------
       Chains / boards / roles serialisation
       --------------------------------------------------------------------- */
    function serializeChain(row) {
        var c = Object.assign({}, row);
        c.nodes = jsonValue(c.nodes, []);
        c.layout = jsonValue(c.layout, {});
        c.tags = normaliseList(c.tags || '');
        c.colour_label = c.colour_label || '';
        if (c.is_favorite === undefined) c.is_favorite = 0;
        return c;
    }
    function chainPayload(data) {
        return {
            name: (data.name || 'Untitled chain').trim() || 'Untitled chain',
            description: data.description || '',
            nodes: JSON.stringify(jsonValue(data.nodes, [])),
            layout: JSON.stringify(jsonValue(data.layout, {})),
            tags: listForDb(data.tags || ''),
            colour_label: data.colour_label || ''
        };
    }
    function boardPayload(data) {
        return {
            name: (data.name || 'Untitled board').trim() || 'Untitled board',
            description: data.description || '',
            colour_label: data.colour_label || ''
        };
    }
    function serializeRole(row) {
        var r = Object.assign({}, row);
        r.icon = r.icon || '🎯';
        r.colour = r.colour || '#6366f1';
        r.persona = r.persona || '';
        r.tone = r.tone || '';
        r.expertise = r.expertise || '';
        r.example_phrase = r.example_phrase || '';
        r.example_phrases = jsonValue(r.example_phrases, []);
        if (r.is_favorite === undefined) r.is_favorite = 0;
        ['audience', 'output_format', 'constraints', 'domain', 'tasks', 'response_style',
            'goal', 'outcome', 'opening_message', 'persistent_context'].forEach(function (f) {
                r[f] = r[f] || '';
            });
        r.knowledge_base = jsonValue(r.knowledge_base, []);
        r.skills = jsonValue(r.skills, []);
        return r;
    }
    function rolePayload(data) {
        var kb = Array.isArray(data.knowledge_base) ? data.knowledge_base : [];
        var skills = Array.isArray(data.skills) ? data.skills : [];
        return {
            name: (data.name || 'Untitled role').trim() || 'Untitled role',
            icon: data.icon || '🎯',
            colour: data.colour || '#6366f1',
            persona: data.persona || '',
            tone: data.tone || '',
            expertise: data.expertise || '',
            example_phrase: data.example_phrase || '',
            example_phrases: JSON.stringify((data.example_phrases || []).filter(function (e) {
                return e && e.text && e.text.trim();
            }).map(function (e) { return { text: String(e.text) }; })),
            audience: data.audience || '',
            output_format: data.output_format || '',
            constraints: data.constraints || '',
            domain: data.domain || '',
            tasks: data.tasks || '',
            response_style: data.response_style || '',
            goal: data.goal || '',
            outcome: data.outcome || '',
            opening_message: data.opening_message || '',
            persistent_context: data.persistent_context || '',
            knowledge_base: JSON.stringify(kb.map(function (e) {
                return {
                    name: String(e.name || '').trim(),
                    when_to_use: String(e.when_to_use || '').trim(),
                    content: String(e.content || '').trim(),
                    include: e.include !== false
                };
            })),
            skills: JSON.stringify(skills.map(function (e) {
                return {
                    name: String(e.name || '').trim(),
                    description: String(e.description || '').trim(),
                    example: String(e.example || '').trim()
                };
            }))
        };
    }

    /* ---------------------------------------------------------------------
       Route handlers — grouped to mirror app.py's section order
       --------------------------------------------------------------------- */
    var H = {};

    // Settings + licence — mobile always reports a valid licence (decision 3
    // in the build plan: mobile ships premium-unlocked, no gating).
    H.getSettings = async function () {
        var tourDone = await getSetting('tour_done');
        return jsonResponse({ licence: 'MOBILE-BUILD', tour_done: !!tourDone });
    };
    H.setLicenceSetting = async function (ctx) {
        var key = (ctx.body.key || '').trim();
        if (key) await setSetting('licence', key); else await deleteSetting('licence');
        return jsonResponse({ ok: true });
    };
    H.setTourSetting = async function (ctx) {
        if (ctx.body.done) await setSetting('tour_done', '1'); else await deleteSetting('tour_done');
        return jsonResponse({ ok: true });
    };
    H.validateLicence = async function () {
        return jsonResponse({ valid: true, message: 'Premium unlocked!' });
    };
    H.checkLicence = async function () {
        return jsonResponse({ valid: true });
    };

    // Folders
    H.getFolders = async function () {
        var rows = await getAll('folders');
        rows.sort(function (a, b) { return a.name.localeCompare(b.name); });
        return jsonResponse(rows);
    };
    H.createFolder = async function (ctx) {
        var row = await addOne('folders', { name: ctx.body.name, created_at: nowIso() });
        return jsonResponse({ id: row.id, name: row.name });
    };
    H.updateFolder = async function (ctx) {
        var row = await getOne('folders', ctx.params.fid);
        if (row) { row.name = ctx.body.name; await putOne('folders', row); }
        return jsonResponse({ success: true });
    };
    H.deleteFolder = async function (ctx) {
        var prompts = await getAll('prompts');
        for (var i = 0; i < prompts.length; i++) {
            if (prompts[i].folder_id === ctx.params.fid) {
                prompts[i].folder_id = null;
                await putOne('prompts', prompts[i]);
            }
        }
        await deleteOne('folders', ctx.params.fid);
        return jsonResponse({ success: true });
    };

    // Prompts
    H.getPrompts = async function (ctx) {
        var rows = await getAll('prompts');
        var q = ctx.query;
        var search = (q.get('search') || '').toLowerCase();
        var fid = q.get('folder_id');
        var favs = q.get('favorites') || '0';
        var colour = q.get('colour_label') || '';
        var minRating = q.get('min_rating');
        rows = rows.filter(function (p) {
            if (search) {
                var hay = [p.title, p.content, p.description, p.tags].join(' ').toLowerCase();
                if (hay.indexOf(search) === -1) return false;
            }
            if (fid && p.folder_id !== parseInt(fid, 10)) return false;
            if (favs === '1' && !p.is_favorite) return false;
            if (colour && p.colour_label !== colour) return false;
            if (minRating && !((p.rating || 0) >= parseInt(minRating, 10))) return false;
            return true;
        });
        rows.sort(function (a, b) { return new Date(b.updated_at) - new Date(a.updated_at); });
        return jsonResponse(rows.map(serializePrompt));
    };
    H.getFilterOptions = async function () {
        var rows = await getAll('prompts');
        var catCounts = {}, tagCounts = {};
        rows.forEach(function (r) {
            normaliseList(r.categories || '').forEach(function (c) { catCounts[c] = (catCounts[c] || 0) + 1; });
            normaliseList(r.tags || '').forEach(function (t) { tagCounts[t] = (tagCounts[t] || 0) + 1; });
        });
        function toSorted(counts) {
            return Object.keys(counts).map(function (k) { return { value: k, count: counts[k] }; })
                .sort(function (a, b) { return b.count - a.count || a.value.localeCompare(b.value); });
        }
        return jsonResponse({ categories: toSorted(catCounts), tags: toSorted(tagCounts) });
    };
    H.getPrompt = async function (ctx) {
        var row = await getOne('prompts', ctx.params.pid);
        if (!row) return errorResponse('Not found', 404);
        return jsonResponse(serializePrompt(row));
    };
    H.createPrompt = async function (ctx) {
        var data = promptPayload(ctx.body);
        if (!data.content.trim()) return errorResponse('Prompt content is required', 400);
        data.created_at = nowIso();
        data.updated_at = nowIso();
        data.last_used = null;
        data.use_count = 0;
        data.is_favorite = 0;
        var row = await addOne('prompts', data);
        return jsonResponse({ id: row.id });
    };
    H.updatePrompt = async function (ctx) {
        var locked = await lockedPromptIds();
        if (locked.indexOf(ctx.params.pid) !== -1) {
            return errorResponse('This prompt is locked. Unlock it in Version Lock before editing.', 423);
        }
        var data = promptPayload(ctx.body);
        if (!data.content.trim()) return errorResponse('Prompt content is required', 400);
        var old = await getOne('prompts', ctx.params.pid);
        if (!old) return errorResponse('Not found', 404);
        var verRow = await addOne('prompt_versions', {
            prompt_id: ctx.params.pid, title: old.title, content: old.content,
            description: old.description || '', saved_at: nowIso()
        });
        var versions = (await getAll('prompt_versions')).filter(function (v) { return v.prompt_id === ctx.params.pid; });
        versions.sort(function (a, b) { return new Date(b.saved_at) - new Date(a.saved_at); });
        for (var i = 20; i < versions.length; i++) await deleteOne('prompt_versions', versions[i].id);
        var merged = Object.assign({}, old, data, { id: ctx.params.pid, updated_at: nowIso() });
        await putOne('prompts', merged);
        return jsonResponse({ success: true });
    };
    H.deletePrompt = async function (ctx) {
        var locked = await lockedPromptIds();
        if (locked.indexOf(ctx.params.pid) !== -1) {
            return errorResponse('This prompt is locked. Unlock it in Version Lock before deleting.', 423);
        }
        await deleteOne('prompts', ctx.params.pid);
        return jsonResponse({ success: true });
    };
    H.bulkUpdatePrompts = async function (ctx) {
        var ids = ctx.body.ids || [];
        var action = ctx.body.action;
        if (!ids.length || ['add_tag', 'move_folder'].indexOf(action) === -1) {
            return errorResponse('ids and a valid action are required', 400);
        }
        var success = 0, failed = 0;
        if (action === 'add_tag') {
            var tag = (ctx.body.tag || '').trim();
            if (!tag) return errorResponse('tag is required for add_tag', 400);
            for (var i = 0; i < ids.length; i++) {
                var row = await getOne('prompts', ids[i]);
                if (!row) { failed++; continue; }
                var tags = normaliseList(row.tags);
                if (tags.indexOf(tag) === -1) tags.push(tag);
                row.tags = listForDb(tags);
                row.updated_at = nowIso();
                await putOne('prompts', row);
                success++;
            }
        } else {
            var folderId = folderIdOf(ctx.body.folder_id);
            for (var j = 0; j < ids.length; j++) {
                var r2 = await getOne('prompts', ids[j]);
                if (!r2) { failed++; continue; }
                r2.folder_id = folderId;
                r2.updated_at = nowIso();
                await putOne('prompts', r2);
                success++;
            }
        }
        return jsonResponse({ success: success, failed: failed });
    };
    H.bulkDeletePrompts = async function (ctx) {
        var ids = ctx.body.ids || [];
        if (!ids.length) return errorResponse('ids is required', 400);
        var locked = await lockedPromptIds();
        var skippedLocked = ids.filter(function (id) { return locked.indexOf(id) !== -1; });
        var toDelete = ids.filter(function (id) { return locked.indexOf(id) === -1; });
        var success = 0, failed = 0;
        for (var i = 0; i < toDelete.length; i++) {
            var row = await getOne('prompts', toDelete[i]);
            if (row) { await deleteOne('prompts', toDelete[i]); success++; } else { failed++; }
        }
        return jsonResponse({ success: success, failed: failed, skipped_locked: skippedLocked });
    };
    H.forkPrompt = async function (ctx) {
        var row = await getOne('prompts', ctx.params.pid);
        if (!row) return errorResponse('Not found', 404);
        var p = serializePrompt(row);
        var title = (ctx.body.title || p.title + ' (Fork)').trim() || p.title + ' (Fork)';
        var newRow = await addOne('prompts', {
            title: title, description: p.description, content: p.content,
            categories: listForDb(p.categories), tags: listForDb(p.tags), folder_id: p.folder_id,
            colour_label: p.colour_label, rating: 0, notes: '',
            chain_ids: JSON.stringify(p.chain_ids), variable_meta: JSON.stringify(p.variable_meta),
            chat_turns: JSON.stringify(p.chat_turns), role_id: p.role_id,
            status: 'draft', parent_id: ctx.params.pid,
            prompt_domain: p.prompt_domain, prompt_use_case: p.prompt_use_case,
            prompt_output_format: p.prompt_output_format, prompt_tone: p.prompt_tone,
            created_at: nowIso(), updated_at: nowIso(), last_used: null, use_count: 0, is_favorite: 0
        });
        return jsonResponse({ id: newRow.id });
    };
    H.updatePromptStatus = async function (ctx) {
        var status = ctx.body.status || 'active';
        if (['draft', 'active', 'deprecated'].indexOf(status) === -1) {
            return errorResponse('Invalid status. Must be draft, active, or deprecated.', 400);
        }
        var row = await getOne('prompts', ctx.params.pid);
        if (!row) return errorResponse('Not found', 404);
        row.status = status; row.updated_at = nowIso();
        await putOne('prompts', row);
        return jsonResponse({ success: true, status: status });
    };
    H.toggleFavorite = async function (ctx) {
        var row = await getOne('prompts', ctx.params.pid);
        if (!row) return errorResponse('Not found', 404);
        row.is_favorite = row.is_favorite ? 0 : 1;
        await putOne('prompts', row);
        return jsonResponse({ is_favorite: row.is_favorite });
    };
    H.toggleTemplateTag = async function (ctx) {
        var row = await getOne('prompts', ctx.params.pid);
        if (!row) return errorResponse('Not found', 404);
        var tags = normaliseList(row.tags);
        var isTemplate = tags.some(function (t) { return t.toLowerCase() === 'template'; });
        tags = isTemplate ? tags.filter(function (t) { return t.toLowerCase() !== 'template'; }) : tags.concat(['template']);
        row.tags = listForDb(tags);
        await putOne('prompts', row);
        return jsonResponse({ is_template: !isTemplate });
    };
    H.renameTag = async function (ctx) {
        var src = (ctx.body.from || '').trim();
        var dst = (ctx.body.to || '').trim();
        if (!src) return errorResponse('Missing tag name', 400);
        var rows = await getAll('prompts');
        var changed = 0;
        for (var i = 0; i < rows.length; i++) {
            var tags = normaliseList(rows[i].tags);
            if (!tags.some(function (t) { return t.toLowerCase() === src.toLowerCase(); })) continue;
            var out = [], seen = {};
            tags.forEach(function (t) {
                var v = t.toLowerCase() === src.toLowerCase() ? dst : t;
                var key = v.toLowerCase();
                if (v && !seen[key]) { out.push(v); seen[key] = true; }
            });
            rows[i].tags = listForDb(out);
            rows[i].updated_at = nowIso();
            await putOne('prompts', rows[i]);
            changed++;
        }
        return jsonResponse({ success: true, changed: changed });
    };
    H.usePrompt = async function (ctx) {
        var row = await getOne('prompts', ctx.params.pid);
        if (row) {
            row.use_count = (row.use_count || 0) + 1;
            row.last_used = nowIso();
            await putOne('prompts', row);
        }
        await addOne('usage_log', { prompt_id: ctx.params.pid, used_at: nowIso() });
        return jsonResponse({ success: true });
    };
    H.duplicatePrompt = async function (ctx) {
        var row = await getOne('prompts', ctx.params.pid);
        if (!row) return errorResponse('Not found', 404);
        var p = serializePrompt(row);
        var newRow = await addOne('prompts', {
            title: p.title + ' (Copy)', description: p.description, content: p.content,
            categories: listForDb(p.categories), tags: listForDb(p.tags), folder_id: p.folder_id,
            colour_label: p.colour_label, rating: 0, notes: '',
            chain_ids: JSON.stringify(p.chain_ids), variable_meta: JSON.stringify(p.variable_meta),
            chat_turns: JSON.stringify(p.chat_turns), role_id: p.role_id,
            status: p.status || 'active', parent_id: null,
            prompt_domain: p.prompt_domain, prompt_use_case: p.prompt_use_case,
            prompt_output_format: p.prompt_output_format, prompt_tone: p.prompt_tone,
            created_at: nowIso(), updated_at: nowIso(), last_used: null, use_count: 0, is_favorite: 0
        });
        return jsonResponse({ id: newRow.id });
    };
    H.setRating = async function (ctx) {
        var row = await getOne('prompts', ctx.params.pid);
        if (!row) return errorResponse('Not found', 404);
        row.rating = intBetween(ctx.body.rating || 0, 0, 5);
        if (ctx.body.notes != null) row.notes = ctx.body.notes;
        await putOne('prompts', row);
        return jsonResponse({ success: true });
    };
    H.setColour = async function (ctx) {
        var row = await getOne('prompts', ctx.params.pid);
        if (!row) return errorResponse('Not found', 404);
        row.colour_label = ctx.body.colour || '';
        await putOne('prompts', row);
        return jsonResponse({ success: true });
    };

    // Versions
    H.getVersions = async function (ctx) {
        var rows = (await getAll('prompt_versions')).filter(function (v) { return v.prompt_id === ctx.params.pid; });
        rows.sort(function (a, b) { return new Date(b.saved_at) - new Date(a.saved_at); });
        return jsonResponse(rows);
    };
    H.restoreVersion = async function (ctx) {
        var ver = await getOne('prompt_versions', ctx.params.vid);
        if (!ver || ver.prompt_id !== ctx.params.pid) return errorResponse('Version not found', 404);
        var old = await getOne('prompts', ctx.params.pid);
        if (old) {
            await addOne('prompt_versions', {
                prompt_id: ctx.params.pid, title: old.title, content: old.content,
                description: old.description || '', saved_at: nowIso()
            });
            old.title = ver.title; old.content = ver.content; old.description = ver.description || '';
            old.updated_at = nowIso();
            await putOne('prompts', old);
        }
        return jsonResponse({ success: true });
    };
    H.updateVersionMeta = async function (ctx) {
        var ver = await getOne('prompt_versions', ctx.params.vid);
        if (!ver || ver.prompt_id !== ctx.params.pid) return errorResponse('Version not found', 404);
        if ('version_label' in ctx.body) ver.version_label = ctx.body.version_label;
        if ('version_notes' in ctx.body) ver.version_notes = ctx.body.version_notes;
        if ('is_baseline' in ctx.body) {
            if (ctx.body.is_baseline) {
                var siblings = (await getAll('prompt_versions')).filter(function (v) { return v.prompt_id === ctx.params.pid; });
                for (var i = 0; i < siblings.length; i++) { siblings[i].is_baseline = 0; await putOne('prompt_versions', siblings[i]); }
            }
            ver.is_baseline = ctx.body.is_baseline ? 1 : 0;
        }
        await putOne('prompt_versions', ver);
        return jsonResponse({ success: true });
    };

    // Variable templates
    H.getVarTemplates = async function () {
        var rows = await getAll('variable_templates');
        rows.sort(function (a, b) { return a.name.localeCompare(b.name); });
        rows.forEach(function (r) { r.variables = jsonValue(r.variables, []); });
        return jsonResponse(rows);
    };
    H.createVarTemplate = async function (ctx) {
        var name = (ctx.body.name || '').trim();
        if (!name) return errorResponse('Template name is required', 400);
        var row = await addOne('variable_templates', {
            name: name, description: ctx.body.description || '',
            variables: JSON.stringify(jsonValue(ctx.body.variables, [])), created_at: nowIso()
        });
        return jsonResponse({ id: row.id });
    };
    H.deleteVarTemplate = async function (ctx) {
        await deleteOne('variable_templates', ctx.params.tid);
        return jsonResponse({ success: true });
    };

    // Taxonomy
    H.getTaxonomy = async function () {
        var domains = await getAll('taxonomy_domains');
        var useCases = await getAll('taxonomy_use_cases');
        domains.sort(function (a, b) { return a.name.localeCompare(b.name); });
        var result = domains.map(function (d) {
            var uc = useCases.filter(function (u) { return u.domain_id === d.id; })
                .sort(function (a, b) { return a.name.localeCompare(b.name); })
                .map(function (u) { return { id: u.id, name: u.name }; });
            return { id: d.id, name: d.name, use_cases: uc };
        });
        return jsonResponse(result);
    };
    H.createTaxonomyDomain = async function (ctx) {
        var name = (ctx.body.name || '').trim();
        if (!name) return errorResponse('Name is required', 400);
        var domains = await getAll('taxonomy_domains');
        if (domains.some(function (d) { return d.name === name; })) {
            return errorResponse('A domain with that name already exists', 400);
        }
        var row = await addOne('taxonomy_domains', { name: name });
        return jsonResponse({ id: row.id, name: row.name });
    };
    H.renameTaxonomyDomain = async function (ctx) {
        var name = (ctx.body.name || '').trim();
        if (!name) return errorResponse('Name is required', 400);
        var domains = await getAll('taxonomy_domains');
        if (domains.some(function (d) { return d.name === name && d.id !== ctx.params.did; })) {
            return errorResponse('A domain with that name already exists', 400);
        }
        var row = await getOne('taxonomy_domains', ctx.params.did);
        if (row) { row.name = name; await putOne('taxonomy_domains', row); }
        return jsonResponse({ success: true });
    };
    H.deleteTaxonomyDomain = async function (ctx) {
        var useCases = (await getAll('taxonomy_use_cases')).filter(function (u) { return u.domain_id === ctx.params.did; });
        var ucIds = useCases.map(function (u) { return u.id; });
        var links = await getAll('prompt_taxonomy');
        for (var i = 0; i < links.length; i++) {
            if (ucIds.indexOf(links[i].use_case_id) !== -1) await deleteOne('prompt_taxonomy', links[i].id);
        }
        for (var j = 0; j < useCases.length; j++) await deleteOne('taxonomy_use_cases', useCases[j].id);
        await deleteOne('taxonomy_domains', ctx.params.did);
        return jsonResponse({ success: true });
    };
    H.createTaxonomyUseCase = async function (ctx) {
        var domainId = ctx.body.domain_id;
        var name = (ctx.body.name || '').trim();
        if (!domainId || !name) return errorResponse('domain_id and name are required', 400);
        var existing = await getAll('taxonomy_use_cases');
        if (existing.some(function (u) { return u.domain_id === domainId && u.name === name; })) {
            return errorResponse('A use case with that name already exists', 400);
        }
        var row = await addOne('taxonomy_use_cases', { domain_id: domainId, name: name });
        return jsonResponse({ id: row.id, name: row.name });
    };
    H.renameTaxonomyUseCase = async function (ctx) {
        var name = (ctx.body.name || '').trim();
        if (!name) return errorResponse('Name is required', 400);
        var row = await getOne('taxonomy_use_cases', ctx.params.uid);
        if (row) { row.name = name; await putOne('taxonomy_use_cases', row); }
        return jsonResponse({ success: true });
    };
    H.deleteTaxonomyUseCase = async function (ctx) {
        var links = (await getAll('prompt_taxonomy')).filter(function (l) { return l.use_case_id === ctx.params.uid; });
        for (var i = 0; i < links.length; i++) await deleteOne('prompt_taxonomy', links[i].id);
        await deleteOne('taxonomy_use_cases', ctx.params.uid);
        return jsonResponse({ success: true });
    };
    H.getTaxonomyUseCasePrompts = async function (ctx) {
        var links = (await getAll('prompt_taxonomy')).filter(function (l) { return l.use_case_id === ctx.params.uid; });
        var promptIds = links.map(function (l) { return l.prompt_id; });
        var prompts = await getAll('prompts');
        var result = prompts.filter(function (p) { return promptIds.indexOf(p.id) !== -1; })
            .map(function (p) { return { id: p.id, title: p.title, description: p.description, folder_id: p.folder_id, updated_at: p.updated_at }; })
            .sort(function (a, b) { return a.title.localeCompare(b.title); });
        return jsonResponse(result);
    };
    H.bulkTagTaxonomy = async function (ctx) {
        var promptIds = ctx.body.prompt_ids || [];
        var useCaseId = ctx.body.use_case_id;
        var action = ctx.body.action || 'add';
        if (!promptIds.length || !useCaseId || ['add', 'remove'].indexOf(action) === -1) {
            return errorResponse('prompt_ids, use_case_id and a valid action are required', 400);
        }
        var links = await getAll('prompt_taxonomy');
        if (action === 'add') {
            for (var i = 0; i < promptIds.length; i++) {
                var exists = links.some(function (l) { return l.prompt_id === promptIds[i] && l.use_case_id === useCaseId; });
                if (!exists) await addOne('prompt_taxonomy', { prompt_id: promptIds[i], use_case_id: useCaseId });
            }
        } else {
            for (var j = 0; j < links.length; j++) {
                if (links[j].use_case_id === useCaseId && promptIds.indexOf(links[j].prompt_id) !== -1) {
                    await deleteOne('prompt_taxonomy', links[j].id);
                }
            }
        }
        return jsonResponse({ success: true, count: promptIds.length });
    };

    // Relationships
    H.getPromptRelationships = async function (ctx) {
        var pid = ctx.params.pid;
        var rels = (await getAll('prompt_relationships')).filter(function (r) { return r.prompt_a === pid || r.prompt_b === pid; });
        var prompts = await getAll('prompts');
        var byId = {}; prompts.forEach(function (p) { byId[p.id] = p; });
        var result = rels.map(function (r) {
            var otherId = r.prompt_a === pid ? r.prompt_b : r.prompt_a;
            var other = byId[otherId];
            return other ? { id: other.id, title: other.title, description: other.description, rel_type: r.rel_type } : null;
        }).filter(Boolean).sort(function (a, b) { return a.title.localeCompare(b.title); });
        return jsonResponse(result);
    };
    H.addPromptRelationship = async function (ctx) {
        var pid = ctx.params.pid;
        var otherId = ctx.body.related_id;
        var relType = ctx.body.rel_type || 'related';
        if (!otherId || otherId === pid) return errorResponse('Invalid related_id', 400);
        var a = Math.min(pid, otherId), b = Math.max(pid, otherId);
        var rels = await getAll('prompt_relationships');
        if (!rels.some(function (r) { return r.prompt_a === a && r.prompt_b === b; })) {
            await addOne('prompt_relationships', { prompt_a: a, prompt_b: b, rel_type: relType, created_at: nowIso() });
        }
        return jsonResponse({ success: true });
    };
    H.deletePromptRelationship = async function (ctx) {
        var a = Math.min(ctx.params.pid, ctx.params.other_id), b = Math.max(ctx.params.pid, ctx.params.other_id);
        var rels = await getAll('prompt_relationships');
        for (var i = 0; i < rels.length; i++) {
            if (rels[i].prompt_a === a && rels[i].prompt_b === b) await deleteOne('prompt_relationships', rels[i].id);
        }
        return jsonResponse({ success: true });
    };
    H.getRelationshipOrphans = async function () {
        var rels = await getAll('prompt_relationships');
        var linked = {};
        rels.forEach(function (r) { linked[r.prompt_a] = true; linked[r.prompt_b] = true; });
        var prompts = await getAll('prompts');
        var result = prompts.filter(function (p) { return !linked[p.id]; })
            .map(function (p) { return { id: p.id, title: p.title, description: p.description }; })
            .sort(function (a, b) { return a.title.localeCompare(b.title); });
        return jsonResponse(result);
    };

    // Chains
    H.listChains = async function (ctx) {
        var rows = await getAll('chains');
        if (ctx.query.get('favorites') === '1') rows = rows.filter(function (c) { return c.is_favorite; });
        rows.sort(function (a, b) { return new Date(b.updated_at) - new Date(a.updated_at); });
        return jsonResponse(rows.map(serializeChain));
    };
    H.getChain = async function (ctx) {
        var row = await getOne('chains', ctx.params.cid);
        if (!row) return errorResponse('Not found', 404);
        return jsonResponse(serializeChain(row));
    };
    H.createChain = async function (ctx) {
        var p = chainPayload(ctx.body);
        p.created_at = nowIso(); p.updated_at = nowIso(); p.is_favorite = 0;
        var row = await addOne('chains', p);
        return jsonResponse({ id: row.id });
    };
    H.updateChain = async function (ctx) {
        var old = await getOne('chains', ctx.params.cid);
        if (!old) return errorResponse('Not found', 404);
        var p = chainPayload(ctx.body);
        await putOne('chains', Object.assign({}, old, p, { id: ctx.params.cid, updated_at: nowIso() }));
        return jsonResponse({ success: true });
    };
    H.deleteChain = async function (ctx) {
        await deleteOne('chains', ctx.params.cid);
        return jsonResponse({ success: true });
    };
    H.duplicateChain = async function (ctx) {
        var row = await getOne('chains', ctx.params.cid);
        if (!row) return errorResponse('Not found', 404);
        var c = serializeChain(row);
        var newRow = await addOne('chains', {
            name: c.name + ' (Copy)', description: c.description || '',
            nodes: JSON.stringify(c.nodes), layout: JSON.stringify(c.layout),
            tags: listForDb(c.tags), colour_label: c.colour_label,
            created_at: nowIso(), updated_at: nowIso(), is_favorite: 0
        });
        return jsonResponse({ id: newRow.id });
    };
    H.toggleChainFavorite = async function (ctx) {
        var row = await getOne('chains', ctx.params.cid);
        if (!row) return errorResponse('Not found', 404);
        row.is_favorite = row.is_favorite ? 0 : 1;
        await putOne('chains', row);
        return jsonResponse({ is_favorite: row.is_favorite });
    };

    // Boards
    H.listBoards = async function () {
        var boards = await getAll('boards');
        var pins = await getAll('board_pins');
        var result = boards.map(function (b) {
            var count = pins.filter(function (p) { return p.board_id === b.id; }).length;
            return Object.assign({}, b, { pin_count: count, colour_label: b.colour_label || '' });
        }).sort(function (a, b) { return new Date(b.updated_at) - new Date(a.updated_at); });
        return jsonResponse(result);
    };
    H.createBoard = async function (ctx) {
        var p = boardPayload(ctx.body);
        p.created_at = nowIso(); p.updated_at = nowIso();
        var row = await addOne('boards', p);
        return jsonResponse({ id: row.id });
    };
    H.updateBoard = async function (ctx) {
        var old = await getOne('boards', ctx.params.bid);
        if (!old) return errorResponse('Not found', 404);
        var p = boardPayload(ctx.body);
        await putOne('boards', Object.assign({}, old, p, { id: ctx.params.bid, updated_at: nowIso() }));
        return jsonResponse({ success: true });
    };
    H.deleteBoard = async function (ctx) {
        var pins = (await getAll('board_pins')).filter(function (p) { return p.board_id === ctx.params.bid; });
        for (var i = 0; i < pins.length; i++) await deleteOne('board_pins', pins[i].id);
        await deleteOne('boards', ctx.params.bid);
        return jsonResponse({ success: true });
    };
    H.listBoardPins = async function (ctx) {
        var pins = (await getAll('board_pins')).filter(function (p) { return p.board_id === ctx.params.bid; })
            .sort(function (a, b) { return new Date(b.added_at) - new Date(a.added_at); });
        var prompts = await getAll('prompts');
        var byId = {}; prompts.forEach(function (p) { byId[p.id] = p; });
        var result = pins.map(function (pin) { return byId[pin.prompt_id]; }).filter(Boolean).map(serializePrompt);
        return jsonResponse(result);
    };
    H.addBoardPin = async function (ctx) {
        var promptId = parseInt(ctx.body.prompt_id, 10);
        if (isNaN(promptId)) return errorResponse('prompt_id required', 400);
        var pins = await getAll('board_pins');
        if (!pins.some(function (p) { return p.board_id === ctx.params.bid && p.prompt_id === promptId; })) {
            await addOne('board_pins', { board_id: ctx.params.bid, prompt_id: promptId, added_at: nowIso() });
        }
        var board = await getOne('boards', ctx.params.bid);
        if (board) { board.updated_at = nowIso(); await putOne('boards', board); }
        return jsonResponse({ success: true });
    };
    H.removeBoardPin = async function (ctx) {
        var pins = (await getAll('board_pins')).filter(function (p) { return p.board_id === ctx.params.bid && p.prompt_id === ctx.params.prompt_id; });
        for (var i = 0; i < pins.length; i++) await deleteOne('board_pins', pins[i].id);
        var board = await getOne('boards', ctx.params.bid);
        if (board) { board.updated_at = nowIso(); await putOne('boards', board); }
        return jsonResponse({ success: true });
    };
    H.duplicateBoard = async function (ctx) {
        var row = await getOne('boards', ctx.params.bid);
        if (!row) return errorResponse('Not found', 404);
        var newRow = await addOne('boards', {
            name: row.name + ' (Copy)', description: row.description || '',
            colour_label: row.colour_label || '', created_at: nowIso(), updated_at: nowIso()
        });
        var pinIds = (await getAll('board_pins')).filter(function (p) { return p.board_id === ctx.params.bid; }).map(function (p) { return p.prompt_id; });
        for (var i = 0; i < pinIds.length; i++) await addOne('board_pins', { board_id: newRow.id, prompt_id: pinIds[i], added_at: nowIso() });
        return jsonResponse({ id: newRow.id });
    };

    // Usage log + analytics
    H.getAnalytics = async function () {
        var prompts = await getAll('prompts');
        var folders = await getAll('folders');
        var usageLog = await getAll('usage_log');
        var total = prompts.length;
        var favs = prompts.filter(function (p) { return p.is_favorite; }).length;
        var totalUses = prompts.reduce(function (n, p) { return n + (p.use_count || 0); }, 0);
        var top = prompts.slice().sort(function (a, b) { return (b.use_count || 0) - (a.use_count || 0); }).slice(0, 5)
            .map(function (p) { return { id: p.id, title: p.title, use_count: p.use_count || 0, colour_label: p.colour_label || '' }; });
        var never = prompts.filter(function (p) { return !(p.use_count > 0); }).length;
        var thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        var dailyMap = {};
        usageLog.forEach(function (l) {
            var d = new Date(l.used_at);
            if (d >= thirtyDaysAgo) {
                var day = d.toISOString().slice(0, 10);
                dailyMap[day] = (dailyMap[day] || 0) + 1;
            }
        });
        var daily = Object.keys(dailyMap).sort().map(function (day) { return { day: day, count: dailyMap[day] }; });
        var recent = prompts.filter(function (p) { return p.last_used; })
            .sort(function (a, b) { return new Date(b.last_used) - new Date(a.last_used); }).slice(0, 10)
            .map(function (p) { return { id: p.id, title: p.title, use_count: p.use_count || 0, last_used: p.last_used, colour_label: p.colour_label || '' }; });
        var ratingMap = {};
        prompts.forEach(function (p) { var r = p.rating || 0; ratingMap[r] = (ratingMap[r] || 0) + 1; });
        var ratingDist = Object.keys(ratingMap).sort().map(function (r) { return { rating: Number(r), count: ratingMap[r] }; });
        return jsonResponse({
            summary: { total_prompts: total, total_favourites: favs, total_folders: folders.length, total_uses: totalUses, never_used: never },
            top_prompts: top, recent_prompts: recent, daily_usage: daily, rating_dist: ratingDist
        });
    };
    H.getUsageLog = async function (ctx) {
        var search = (ctx.query.get('search') || '').trim().toLowerCase();
        var limit = Math.min(parseInt(ctx.query.get('limit') || '200', 10) || 200, 500);
        var log = await getAll('usage_log');
        var prompts = await getAll('prompts');
        var byId = {}; prompts.forEach(function (p) { byId[p.id] = p; });
        var rows = log.map(function (l) {
            var p = byId[l.prompt_id];
            return { id: l.id, prompt_id: l.prompt_id, used_at: l.used_at, prompt_title: p ? p.title : '', prompt_content: p ? p.content : '' };
        });
        if (search) {
            rows = rows.filter(function (r) { return r.prompt_title.toLowerCase().indexOf(search) !== -1 || r.prompt_content.toLowerCase().indexOf(search) !== -1; });
        }
        rows.sort(function (a, b) { return new Date(b.used_at) - new Date(a.used_at); });
        return jsonResponse(rows.slice(0, limit));
    };

    // Locked prompts
    H.getLockedPrompts = async function () {
        var ids = await lockedPromptIds();
        return jsonResponse(ids.slice().sort(function (a, b) { return a - b; }));
    };
    H.lockPrompt = async function (ctx) {
        var exists = await getOne('prompts', ctx.params.pid);
        if (!exists) return errorResponse('Prompt not found', 404);
        var ids = await lockedPromptIds();
        if (ids.indexOf(ctx.params.pid) === -1) ids.push(ctx.params.pid);
        await saveLockedPromptIds(ids);
        return jsonResponse({ ok: true, locked: ids.slice().sort(function (a, b) { return a - b; }) });
    };
    H.unlockPrompt = async function (ctx) {
        var ids = (await lockedPromptIds()).filter(function (id) { return id !== ctx.params.pid; });
        await saveLockedPromptIds(ids);
        return jsonResponse({ ok: true, locked: ids.slice().sort(function (a, b) { return a - b; }) });
    };

    // Roles
    H.listRoles = async function (ctx) {
        var rows = await getAll('roles');
        if (ctx.query.get('favorites') === '1') rows = rows.filter(function (r) { return r.is_favorite; });
        rows.sort(function (a, b) { return new Date(b.updated_at || 0) - new Date(a.updated_at || 0); });
        return jsonResponse(rows.map(serializeRole));
    };
    H.getRole = async function (ctx) {
        var row = await getOne('roles', ctx.params.rid);
        if (!row) return errorResponse('Not found', 404);
        return jsonResponse(serializeRole(row));
    };
    H.createRole = async function (ctx) {
        var p = rolePayload(ctx.body);
        p.created_at = nowIso(); p.updated_at = nowIso(); p.is_favorite = 0;
        var row = await addOne('roles', p);
        return jsonResponse({ id: row.id });
    };
    H.updateRole = async function (ctx) {
        var old = await getOne('roles', ctx.params.rid);
        if (!old) return errorResponse('Not found', 404);
        var p = rolePayload(ctx.body);
        await putOne('roles', Object.assign({}, old, p, { id: ctx.params.rid, updated_at: nowIso() }));
        return jsonResponse({ success: true });
    };
    H.deleteRole = async function (ctx) {
        await deleteOne('roles', ctx.params.rid);
        return jsonResponse({ success: true });
    };
    H.duplicateRole = async function (ctx) {
        var row = await getOne('roles', ctx.params.rid);
        if (!row) return errorResponse('Not found', 404);
        var r = serializeRole(row);
        var newRow = await addOne('roles', {
            name: r.name + ' (Copy)', icon: r.icon, colour: r.colour, persona: r.persona,
            tone: r.tone, expertise: r.expertise, example_phrase: r.example_phrase,
            example_phrases: JSON.stringify(r.example_phrases), knowledge_base: JSON.stringify(r.knowledge_base),
            skills: JSON.stringify(r.skills), audience: r.audience, output_format: r.output_format,
            constraints: r.constraints, domain: r.domain, tasks: r.tasks, response_style: r.response_style,
            goal: r.goal, outcome: r.outcome, opening_message: r.opening_message, persistent_context: r.persistent_context,
            created_at: nowIso(), updated_at: nowIso(), is_favorite: 0
        });
        return jsonResponse({ id: newRow.id });
    };
    H.toggleRoleFavorite = async function (ctx) {
        var row = await getOne('roles', ctx.params.rid);
        if (!row) return errorResponse('Not found', 404);
        row.is_favorite = row.is_favorite ? 0 : 1;
        await putOne('roles', row);
        return jsonResponse({ is_favorite: row.is_favorite });
    };
    H.setPromptRole = async function (ctx) {
        var rid = idOrNull(ctx.body.role_id);
        var row = await getOne('prompts', ctx.params.pid);
        if (row) { row.role_id = rid; await putOne('prompts', row); }
        return jsonResponse({ success: true, role_id: rid });
    };
    H.rolePromptCount = async function (ctx) {
        var prompts = await getAll('prompts');
        var count = prompts.filter(function (p) { return p.role_id === ctx.params.rid; }).length;
        return jsonResponse({ count: count });
    };

    // Settings — author, role chips, AI config/keys/baseurls/providers
    H.getAuthorName = async function () {
        var stored = await getSetting('author_name');
        return jsonResponse({ author_name: stored || '' });
    };
    H.setAuthorName = async function (ctx) {
        var name = (ctx.body.author_name || '').trim();
        if (name) await setSetting('author_name', name); else await deleteSetting('author_name');
        return jsonResponse({ ok: true });
    };
    H.getRoleChipsSetting = async function () {
        var val = await getSetting('role_chips_always_visible');
        return jsonResponse({ enabled: val === '1' });
    };
    H.setRoleChipsSetting = async function (ctx) {
        await setSetting('role_chips_always_visible', ctx.body.enabled ? '1' : '0');
        return jsonResponse({ ok: true });
    };
    H.getAiConfig = async function () {
        var provider = (await getSetting('ai_provider')) || 'openai';
        var db = await openDB();
        var allSettings = await reqToPromise(db.transaction('settings', 'readonly').objectStore('settings').getAll());
        var hasKey = allSettings.some(function (s) { return s.key === 'ai_apikey_' + provider && s.value; });
        return jsonResponse({ provider: provider, has_key: hasKey });
    };
    H.saveAiConfig = async function (ctx) {
        await setSetting('ai_provider', ctx.body.provider || 'openai');
        return jsonResponse({ ok: true });
    };
    H.getAiKeys = async function () {
        var db = await openDB();
        var allSettings = await reqToPromise(db.transaction('settings', 'readonly').objectStore('settings').getAll());
        var out = {};
        allSettings.forEach(function (s) { if (s.key.indexOf('ai_apikey_') === 0) out[s.key.slice(10)] = s.value; });
        return jsonResponse(out);
    };
    H.saveAiKey = async function (ctx) {
        var provider = ctx.body.provider || '';
        var key = (ctx.body.key || '').trim();
        if (!/^[a-z0-9_]{1,40}$/.test(provider)) return errorResponse('unknown provider', 400);
        if (key) await setSetting('ai_apikey_' + provider, key); else await deleteSetting('ai_apikey_' + provider);
        return jsonResponse({ ok: true });
    };
    H.getAiBaseurls = async function () {
        var db = await openDB();
        var allSettings = await reqToPromise(db.transaction('settings', 'readonly').objectStore('settings').getAll());
        var out = {};
        allSettings.forEach(function (s) { if (s.key.indexOf('ai_baseurl_') === 0) out[s.key.slice(11)] = s.value; });
        return jsonResponse(out);
    };
    H.saveAiBaseurl = async function (ctx) {
        var provider = ctx.body.provider || '';
        var url = (ctx.body.url || '').trim();
        if (!/^[a-z0-9_]{1,40}$/.test(provider)) return errorResponse('unknown provider', 400);
        if (url) await setSetting('ai_baseurl_' + provider, url); else await deleteSetting('ai_baseurl_' + provider);
        return jsonResponse({ ok: true });
    };
    H.getAiProviders = async function () {
        var db = await openDB();
        var allSettings = await reqToPromise(db.transaction('settings', 'readonly').objectStore('settings').getAll());
        var out = allSettings.filter(function (s) { return s.key.indexOf('ai_customprovider_') === 0; })
            .map(function (s) { return { slug: s.key.slice(19), label: s.value }; });
        return jsonResponse(out);
    };
    H.saveAiProvider = async function (ctx) {
        var slug = ctx.body.slug || '';
        var label = (ctx.body.label || '').trim();
        if (!/^[a-z0-9_]{1,40}$/.test(slug) || !label) return errorResponse('invalid provider', 400);
        await setSetting('ai_customprovider_' + slug, label);
        return jsonResponse({ ok: true });
    };

    /* ---------------------------------------------------------------------
       Router
       --------------------------------------------------------------------- */
    function compile(path) {
        var keys = [];
        var re = new RegExp('^' + path.replace(/:[A-Za-z]+/g, function (m) {
            keys.push(m.slice(1));
            return '([^/]+)';
        }) + '$');
        return { re: re, keys: keys };
    }
    var ROUTES = [
        ['GET', '/settings', H.getSettings],
        ['POST', '/settings/licence', H.setLicenceSetting],
        ['POST', '/settings/tour', H.setTourSetting],
        ['POST', '/licence/validate', H.validateLicence],
        ['POST', '/licence/check', H.checkLicence],

        ['GET', '/folders', H.getFolders],
        ['POST', '/folders', H.createFolder],
        ['PUT', '/folders/:fid', H.updateFolder],
        ['DELETE', '/folders/:fid', H.deleteFolder],

        ['GET', '/prompts', H.getPrompts],
        ['GET', '/prompts/filters', H.getFilterOptions],
        ['GET', '/prompts/:pid', H.getPrompt],
        ['POST', '/prompts', H.createPrompt],
        ['PUT', '/prompts/:pid', H.updatePrompt],
        ['DELETE', '/prompts/:pid', H.deletePrompt],
        ['PATCH', '/prompts/bulk', H.bulkUpdatePrompts],
        ['DELETE', '/prompts/bulk', H.bulkDeletePrompts],
        ['POST', '/prompts/:pid/fork', H.forkPrompt],
        ['PATCH', '/prompts/:pid/status', H.updatePromptStatus],
        ['POST', '/prompts/:pid/favorite', H.toggleFavorite],
        ['POST', '/prompts/:pid/template', H.toggleTemplateTag],
        ['POST', '/tags/rename', H.renameTag],
        ['POST', '/prompts/:pid/use', H.usePrompt],
        ['POST', '/prompts/:pid/duplicate', H.duplicatePrompt],
        ['POST', '/prompts/:pid/rating', H.setRating],
        ['POST', '/prompts/:pid/colour', H.setColour],

        ['GET', '/prompts/:pid/versions', H.getVersions],
        ['POST', '/prompts/:pid/versions/:vid/restore', H.restoreVersion],
        ['PUT', '/prompts/:pid/versions/:vid', H.updateVersionMeta],

        ['GET', '/variable-templates', H.getVarTemplates],
        ['POST', '/variable-templates', H.createVarTemplate],
        ['DELETE', '/variable-templates/:tid', H.deleteVarTemplate],

        ['GET', '/taxonomy', H.getTaxonomy],
        ['POST', '/taxonomy/domains', H.createTaxonomyDomain],
        ['PUT', '/taxonomy/domains/:did', H.renameTaxonomyDomain],
        ['DELETE', '/taxonomy/domains/:did', H.deleteTaxonomyDomain],
        ['POST', '/taxonomy/use-cases', H.createTaxonomyUseCase],
        ['PUT', '/taxonomy/use-cases/:uid', H.renameTaxonomyUseCase],
        ['DELETE', '/taxonomy/use-cases/:uid', H.deleteTaxonomyUseCase],
        ['GET', '/taxonomy/use-cases/:uid/prompts', H.getTaxonomyUseCasePrompts],
        ['POST', '/taxonomy/bulk-tag', H.bulkTagTaxonomy],

        ['GET', '/prompts/:pid/relationships', H.getPromptRelationships],
        ['POST', '/prompts/:pid/relationships', H.addPromptRelationship],
        ['DELETE', '/prompts/:pid/relationships/:other_id', H.deletePromptRelationship],
        ['GET', '/relationships/orphans', H.getRelationshipOrphans],

        ['GET', '/chains', H.listChains],
        ['GET', '/chains/:cid', H.getChain],
        ['POST', '/chains', H.createChain],
        ['PUT', '/chains/:cid', H.updateChain],
        ['DELETE', '/chains/:cid', H.deleteChain],
        ['POST', '/chains/:cid/duplicate', H.duplicateChain],
        ['POST', '/chains/:cid/favorite', H.toggleChainFavorite],

        ['GET', '/boards', H.listBoards],
        ['POST', '/boards', H.createBoard],
        ['PUT', '/boards/:bid', H.updateBoard],
        ['DELETE', '/boards/:bid', H.deleteBoard],
        ['GET', '/boards/:bid/pins', H.listBoardPins],
        ['POST', '/boards/:bid/pins', H.addBoardPin],
        ['DELETE', '/boards/:bid/pins/:prompt_id', H.removeBoardPin],
        ['POST', '/boards/:bid/duplicate', H.duplicateBoard],

        ['GET', '/analytics', H.getAnalytics],
        ['GET', '/usage-log', H.getUsageLog],

        ['GET', '/locked-prompts', H.getLockedPrompts],
        ['POST', '/locked-prompts/:pid', H.lockPrompt],
        ['DELETE', '/locked-prompts/:pid', H.unlockPrompt],

        ['GET', '/roles', H.listRoles],
        ['GET', '/roles/:rid', H.getRole],
        ['POST', '/roles', H.createRole],
        ['PUT', '/roles/:rid', H.updateRole],
        ['DELETE', '/roles/:rid', H.deleteRole],
        ['POST', '/roles/:rid/duplicate', H.duplicateRole],
        ['POST', '/roles/:rid/favorite', H.toggleRoleFavorite],
        ['PATCH', '/prompts/:pid/role', H.setPromptRole],
        ['GET', '/roles/:rid/prompt-count', H.rolePromptCount],

        ['GET', '/settings/author', H.getAuthorName],
        ['POST', '/settings/author', H.setAuthorName],
        ['GET', '/settings/role-chips-always', H.getRoleChipsSetting],
        ['POST', '/settings/role-chips-always', H.setRoleChipsSetting],
        ['GET', '/settings/ai-config', H.getAiConfig],
        ['POST', '/settings/ai-config', H.saveAiConfig],
        ['GET', '/settings/ai-keys', H.getAiKeys],
        ['POST', '/settings/ai-keys', H.saveAiKey],
        ['GET', '/settings/ai-baseurls', H.getAiBaseurls],
        ['POST', '/settings/ai-baseurls', H.saveAiBaseurl],
        ['GET', '/settings/ai-providers', H.getAiProviders],
        ['POST', '/settings/ai-providers', H.saveAiProvider]
    ].map(function (r) {
        return { method: r[0], path: r[1], compiled: compile(r[1]), handler: r[2] };
    });

    var NUMERIC_PARAMS = ['fid', 'pid', 'vid', 'tid', 'did', 'uid', 'cid', 'bid', 'rid', 'other_id', 'prompt_id'];

    async function routeRequest(method, url, bodyText) {
        await _seedPromise;
        var apiPath = url.pathname.replace(/^\/api/, '') || '/';
        for (var i = 0; i < ROUTES.length; i++) {
            var route = ROUTES[i];
            if (route.method !== method) continue;
            var m = route.compiled.re.exec(apiPath);
            if (!m) continue;
            var params = {};
            route.compiled.keys.forEach(function (key, idx) {
                var raw = decodeURIComponent(m[idx + 1]);
                params[key] = NUMERIC_PARAMS.indexOf(key) !== -1 ? parseInt(raw, 10) : raw;
            });
            var body = {};
            if (bodyText) {
                try { body = JSON.parse(bodyText); } catch (e) { body = {}; }
            }
            try {
                return await route.handler({ params: params, query: url.searchParams, body: body || {} });
            } catch (err) {
                console.error('local-api handler error', method, apiPath, err);
                return errorResponse('Internal error: ' + err.message, 500);
            }
        }
        return errorResponse('Not found: ' + method + ' ' + apiPath, 404);
    }

    /* ---------------------------------------------------------------------
       fetch() interception + network resilience
       --------------------------------------------------------------------- */
    var PASSTHROUGH_TIMEOUT_MS = 10000;
    var realFetch = window.fetch.bind(window);

    function isApiUrl(url) {
        return url.origin === location.origin && url.pathname.indexOf('/api/') === 0;
    }

    window.fetch = function (input, init) {
        init = init || {};
        var url;
        var method = (init.method || (input && input.method) || 'GET').toUpperCase();
        var bodyText = init.body;
        try {
            url = new URL(typeof input === 'string' ? input : input.url, location.href);
        } catch (e) {
            return realFetch(input, init);
        }

        if (isApiUrl(url)) {
            return routeRequest(method, url, typeof bodyText === 'string' ? bodyText : null);
        }

        // Passthrough (fonts, LLM providers): guard with a timeout so a dropped
        // connection rejects cleanly instead of hanging the caller forever.
        var controller = new AbortController();
        var mergedInit = Object.assign({}, init, { signal: init.signal || controller.signal });
        var timeoutId = setTimeout(function () { controller.abort(); }, PASSTHROUGH_TIMEOUT_MS);
        return realFetch(input, mergedInit).finally(function () { clearTimeout(timeoutId); });
    };

    /* ---------------------------------------------------------------------
       Offline banner — non-blocking signal, core screens work without it
       --------------------------------------------------------------------- */
    function ensureOfflineBanner() {
        var el = document.getElementById('mobileOfflineBanner');
        if (el) return el;
        el = document.createElement('div');
        el.id = 'mobileOfflineBanner';
        el.setAttribute('role', 'status');
        el.textContent = "You're offline — your library still works.";
        document.addEventListener('DOMContentLoaded', function () { document.body.appendChild(el); });
        if (document.body) document.body.appendChild(el);
        return el;
    }
    function updateOfflineBanner() {
        var el = ensureOfflineBanner();
        el.classList.toggle('is-visible', !navigator.onLine);
    }
    window.addEventListener('online', updateOfflineBanner);
    window.addEventListener('offline', updateOfflineBanner);
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateOfflineBanner);
    } else {
        updateOfflineBanner();
    }

    /* ---------------------------------------------------------------------
       Mobile nav drawer — closes the existing #sidebarToggleBtn drawer
       (see the .sidebar-hidden override in app.css) on an outside tap or
       after picking a nav item, since nothing else in app.js knows this
       class means "drawer open" only below the phone breakpoint.
       --------------------------------------------------------------------- */
    function isMobileDrawerWidth() {
        return window.matchMedia('(max-width: 760px)').matches;
    }
    document.addEventListener('click', function (e) {
        if (!isMobileDrawerWidth()) return;
        if (!document.body.classList.contains('sidebar-hidden')) return;
        var insideSidebar = e.target.closest('#sidebar');
        var isToggle = e.target.closest('#sidebarToggleBtn');
        if (isToggle) return;
        if (!insideSidebar || e.target.closest('.nav-item, .folder-item, .filter-list-item, [data-filter-cat], [data-filter-tag]')) {
            document.body.classList.remove('sidebar-hidden');
        }
    }, true);
})();
