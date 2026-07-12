path = r"C:\Users\Eugene Phillips\Documents\GitHub\Prompt-Library-Update\static\app.js"
data = open(path, "rb").read()
data = data.replace(b'\x00', b'')
content = data.decode("utf-8")
content = content.replace('\r\n', '\n')

old1 = """                const notes = [sourcePrompt.notes, extraNote].filter(Boolean).join('\\n');
                const existingTags = Array.isArray(sourcePrompt.tags) ? sourcePrompt.tags.join(',') : (sourcePrompt.tags || '');
                const mergedTags = existingTags ? existingTags + ',' + tags : tags;"""

new1 = """                const priorNotes = sourcePrompt.notes || '';
                const notes = (extraNote && priorNotes.endsWith(extraNote))
                    ? priorNotes
                    : [priorNotes, extraNote].filter(Boolean).join('\\n');
                const existingTags = Array.isArray(sourcePrompt.tags) ? sourcePrompt.tags.join(',') : (sourcePrompt.tags || '');
                const mergedTags = Array.from(new Set(
                    (existingTags ? existingTags + ',' + tags : tags)
                        .split(',')
                        .map(t => t.trim())
                        .filter(Boolean)
                )).join(',');"""

assert content.count(old1) == 1, "Finding 1 marker not found exactly once"
content = content.replace(old1, new1)

old2 = """            const text = $('#audInput')?.value?.trim();
            if (!text || !_audLastResult) {
                toast('Audit a prompt first', 'warning');
                return;
            }
            const picked = _wsPickedPrompt('#audPicker');
            const title = ((picked?.title || 'Audited prompt') + ' (audited)').slice(0, 120);
            const topFindings = _audLastResult.findings.slice(0, 3).map(f => f.text).join(' | ');
            const note = 'Audited via Prompt Auditor workspace — score ' + _audLastResult.overall + '/100.' +
                (topFindings ? ' Top findings: ' + topFindings : '');"""

new2 = """            const text = $('#audInput')?.value?.trim();
            if (!text) {
                toast('Audit a prompt first', 'warning');
                return;
            }
            const freshResult = _audScore(text);
            const picked = _wsPickedPrompt('#audPicker');
            const title = ((picked?.title || 'Audited prompt') + ' (audited)').slice(0, 120);
            const topFindings = freshResult.findings.slice(0, 3).map(f => f.text).join(' | ');
            const note = 'Audited via Prompt Auditor workspace — score ' + freshResult.overall + '/100.' +
                (topFindings ? ' Top findings: ' + topFindings : '');"""

assert content.count(old2) == 1, "Finding 2 marker not found exactly once"
content = content.replace(old2, new2)

open(path, "w", encoding="utf-8", newline="\n").write(content)
print("patched OK")
