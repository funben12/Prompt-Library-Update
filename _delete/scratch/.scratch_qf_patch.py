import io

path = r"C:\Users\Eugene Phillips\Documents\GitHub\Prompt-Library-Update\static\app.js"

with open(path, 'rb') as f:
    data = f.read()

data = data.replace(b'\x00', b'')
content = data.decode('utf-8')

orig_len = len(content)

# --- Finding 3: acronym-aware camelCase splitting in _qfWords ---
old_words = """    function _qfWords(name) {
        return (name || '')
            .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
            .split(/[^a-zA-Z0-9]+/)
            .map(w => w.toLowerCase())
            .filter(Boolean);
    }"""
new_words = """    function _qfWords(name) {
        return (name || '')
            .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
            .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
            .split(/[^a-zA-Z0-9]+/)
            .map(w => w.toLowerCase())
            .filter(Boolean);
    }"""
assert content.count(old_words) == 1, "old_words not found exactly once"
content = content.replace(old_words, new_words)

# --- Finding 4: aria-label on the type select ---
old_select = """    function _qfTypeSelectHtml(v, idx) {
        const types = ['text', 'longtext', 'number', 'boolean'];
        const labels = { text: 'Text', longtext: 'Long text', number: 'Number', boolean: 'Yes/No' };
        const opts = types.map(t =>
            '<option value="' + t + '"' + (v.type === t ? ' selected' : '') + '>' + labels[t] + '</option>'
        ).join('');
        return '<select class="qf-type-select" data-qf-type-idx="' + idx + '">' + opts + '</select>';
    }"""
new_select = """    function _qfTypeSelectHtml(v, idx) {
        const types = ['text', 'longtext', 'number', 'boolean'];
        const labels = { text: 'Text', longtext: 'Long text', number: 'Number', boolean: 'Yes/No' };
        const opts = types.map(t =>
            '<option value="' + t + '"' + (v.type === t ? ' selected' : '') + '>' + labels[t] + '</option>'
        ).join('');
        return '<select class="qf-type-select" data-qf-type-idx="' + idx + '" aria-label="Field type for ' +
            escapeAttr(v.name || v.token) + '">' + opts + '</select>';
    }"""
assert content.count(old_select) == 1, "old_select not found exactly once"
content = content.replace(old_select, new_select)

# --- Finding 2: single _qfMemGet call per variable, reused for type + value ---
old_render_head = """        _qfVars = extracted.map(v => {
            const remembered = _qfMemGet(v.name);
            return { token: v.token, name: v.name, type: remembered.type || _qfGuessType(v.name) };
        });"""
new_render_head = """        _qfVars = extracted.map(v => {
            const remembered = _qfMemGet(v.name);
            return { token: v.token, name: v.name, type: remembered.type || _qfGuessType(v.name), value: remembered.value || '' };
        });"""
assert content.count(old_render_head) == 1, "old_render_head not found exactly once"
content = content.replace(old_render_head, new_render_head)

old_field_map = """        list.innerHTML = _qfVars.map((v, i) => {
            const value = _qfMemGet(v.name).value || '';
            return '<div class="qf-field">' +"""
new_field_map = """        list.innerHTML = _qfVars.map((v, i) => {
            const value = v.value;
            return '<div class="qf-field">' +"""
assert content.count(old_field_map) == 1, "old_field_map not found exactly once"
content = content.replace(old_field_map, new_field_map)

# --- Finding 1: persist the NEW control's actual value after the DOM swap, not the old one ---
old_change_handler = """                const wrapper = sel.closest('.qf-field');
                const oldInput = wrapper.querySelector('.qf-var-input');
                const currentValue = oldInput ? oldInput.value : '';
                v.type = sel.value;
                _qfRemember({ [v.name]: { value: currentValue, type: v.type } });
                oldInput.outerHTML = _qfFieldControlHtml(v, idx, currentValue);
                _qfWireFieldInput(wrapper.querySelector('.qf-var-input'));
                _qfRenderPreview();"""
new_change_handler = """                const wrapper = sel.closest('.qf-field');
                const oldInput = wrapper.querySelector('.qf-var-input');
                const currentValue = oldInput ? oldInput.value : '';
                v.type = sel.value;
                oldInput.outerHTML = _qfFieldControlHtml(v, idx, currentValue);
                const newInput = wrapper.querySelector('.qf-var-input');
                _qfWireFieldInput(newInput);
                _qfRemember({ [v.name]: { value: newInput ? newInput.value : currentValue, type: v.type } });
                _qfRenderPreview();"""
assert content.count(old_change_handler) == 1, "old_change_handler not found exactly once"
content = content.replace(old_change_handler, new_change_handler)

new_len = len(content)
print("orig_len:", orig_len, "new_len:", new_len, "delta:", new_len - orig_len)

with open(path, 'wb') as f:
    f.write(content.encode('utf-8'))

print("PATCH OK")
