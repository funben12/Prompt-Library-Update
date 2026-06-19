import re

with open('static/app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: openRoleInEditor - fix workflow_notes typo + add new fields
old1 = "  set('#roleConstraintsInput', role.constraints     || '');\n  set('#roleOutputFormatInput',role.output_format   || '');\n  set('#roleTasksInput',       role.workflow_notes  || '');"
new1 = (
    "  set('#roleConstraintsInput',  role.constraints        || '');\n"
    "  set('#roleOutputFormatInput', role.output_format      || '');\n"
    "  set('#roleTasksInput',        role.tasks              || '');\n"
    "  set('#roleGoalInput',         role.goal               || '');\n"
    "  set('#roleOutcomeInput',      role.outcome            || '');\n"
    "  set('#roleInitInput',         role.opening_message    || '');\n"
    "  set('#roleMemoryInput',       role.persistent_context || '');\n"
    "  set('#rolePersonaInput',      role.persona            || '');"
)
assert old1 in content, "FIX1 NOT FOUND"
content = content.replace(old1, new1)
print("Fix1 done")

# Fix 2: openRoleInEditor - fix chip restoration per group
# Use a regex to find the chip restoration block since the dashes might differ
m2 = re.search(
    r"  // Response style chips [^\n]*\n  const savedStyle[^\n]+\n  \$\$\('\.role-chip'\)\.forEach[^\n]+\n    chip\.classList\.toggle[^\n]+\n  \}\);",
    content
)
assert m2, "FIX2 NOT FOUND"
old2 = m2.group(0)
new2 = (
    "  // Restore chips per group from saved values\n"
    "  const _restoreChip = (groupSel, val) => {\n"
    "    if (!val) return;\n"
    "    const v = val.toLowerCase();\n"
    "    $$(groupSel + ' .role-chip').forEach(c => c.classList.toggle('on', c.dataset.val === v));\n"
    "  };\n"
    "  _restoreChip('#roleStyleChips',      role.response_style);\n"
    "  _restoreChip('#roleDepthChips',      role.depth);\n"
    "  _restoreChip('#roleFormatModeChips', role.format_mode);\n"
    "  _restoreChip('#roleProcTypeChips',   role.interaction_mode);\n"
    "  const savedFlags = Array.isArray(role.behaviour_flags) ? role.behaviour_flags : [];\n"
    "  $$('#roleFlagChips .role-chip').forEach(c => c.classList.toggle('on', savedFlags.includes(c.dataset.val)));"
)
content = content.replace(old2, new2)
print("Fix2 done")

# Fix 3: getRoleFromForm - fix all field mappings
# Find the return block in getRoleFromForm
m3 = re.search(
    r"  return \{\n    name:\s+\$\('#roleNameInput'\)\?\.value\?\.trim\(\)\s+\|\| '',\n.*?workflow_notes:.*?\n    skills:\s+skillEntries,\n  \};",
    content, re.DOTALL
)
assert m3, "FIX3 NOT FOUND"
old3 = m3.group(0)
new3 = (
    "  const _chipVal = (sel) => $(sel + ' .role-chip.on')?.dataset?.val || '';\n"
    "  const flagVals = [];\n"
    "  $$('#roleFlagChips .role-chip.on').forEach(c => { if (c.dataset.val) flagVals.push(c.dataset.val); });\n"
    "\n"
    "  return {\n"
    "    name:               $('#roleNameInput')?.value?.trim()             || '',\n"
    "    icon:               $('#roleIconBtn')?.textContent?.trim()          || '\U0001f916',\n"
    "    colour:             $('#roleColourPicker')?.value                   || '#6366f1',\n"
    "    prompt_starter:     (($('#rolePromptStarter')?.value || 'You are a') + ' ' + ($('#roleTypeInput')?.value?.trim() || '')).trim(),\n"
    "    persona:            $('#rolePersonaInput')?.value                   || '',\n"
    "    tone:               $('#roleToneInput')?.value                      || '',\n"
    "    expertise:          $('#roleExpertiseInput')?.value                 || '',\n"
    "    response_style:     _chipVal('#roleStyleChips'),\n"
    "    depth:              _chipVal('#roleDepthChips'),\n"
    "    format_mode:        _chipVal('#roleFormatModeChips'),\n"
    "    interaction_mode:   _chipVal('#roleProcTypeChips'),\n"
    "    behaviour_flags:    flagVals,\n"
    "    audience:           $('#roleAudienceInput')?.value                  || '',\n"
    "    domain:             $('#roleDomainInput')?.value                    || '',\n"
    "    constraints:        $('#roleConstraintsInput')?.value               || '',\n"
    "    output_format:      $('#roleOutputFormatInput')?.value              || '',\n"
    "    tasks:              $('#roleTasksInput')?.value                     || '',\n"
    "    goal:               $('#roleGoalInput')?.value                      || '',\n"
    "    outcome:            $('#roleOutcomeInput')?.value                   || '',\n"
    "    opening_message:    $('#roleInitInput')?.value                      || '',\n"
    "    persistent_context: $('#roleMemoryInput')?.value                    || '',\n"
    "    example_phrases:    _getExamplesFromDOM(),\n"
    "    knowledge_base:     kbEntries,\n"
    "    skills:             skillEntries,\n"
    "  };"
)
content = content.replace(old3, new3)
print("Fix3 done")

# Fix 4: chip click handler - enforce single-select
m4 = re.search(
    r"  // [^\n]*[Bb]ehaviour chips[^\n]*\n  document\.addEventListener\('click', e => \{\n    const chip = e\.target\.closest\('\.role-chip'\);\n    if \(!chip \|\| !\$\('#rolesWorkspace'\)\?\.classList\.contains\('open'\)\) return;\n    chip\.classList\.toggle\('on'\);\n    updateRolePromptPreview\(\);\n  \}\);",
    content
)
if m4:
    old4 = m4.group(0)
    new4 = (
        "  // Behaviour chips - single-select groups enforce exclusivity\n"
        "  const SINGLE_SELECT_GROUPS = ['roleStyleChips', 'roleDepthChips', 'roleFormatModeChips', 'roleProcTypeChips'];\n"
        "  document.addEventListener('click', e => {\n"
        "    const chip = e.target.closest('.role-chip');\n"
        "    if (!chip || !$('#rolesWorkspace')?.classList.contains('open')) return;\n"
        "    const group = chip.closest('.role-chip-group');\n"
        "    if (group && SINGLE_SELECT_GROUPS.includes(group.id)) {\n"
        "      const wasOn = chip.classList.contains('on');\n"
        "      group.querySelectorAll('.role-chip').forEach(c => c.classList.remove('on'));\n"
        "      if (!wasOn) chip.classList.add('on');\n"
        "    } else {\n"
        "      chip.classList.toggle('on');\n"
        "    }\n"
        "    updateRolePromptPreview();\n"
        "  });"
    )
    content = content.replace(old4, new4)
    print("Fix4 done")
else:
    print("Fix4: not found - skipping")

with open('static/app.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("All fixes written to app.js")
