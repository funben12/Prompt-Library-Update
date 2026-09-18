"""Vault scanning: parse .md files with YAML-style front matter into dicts,
and walk a vault folder to list every prompt file in it.

No PyYAML dependency. Front matter here is a known, narrow subset (flat
key: value pairs, one level of flow-style [a, b, c] lists, no nesting), so
a small hand-rolled parser avoids adding a dependency for it.

A second, simpler format is also accepted for files written by hand outside
the app: plain [[Title]] / [[Description]] / [[Prompt]] / [[Categories]] /
[[Tags]] section markers, each on their own line, with everything up to the
next marker (or end of file) as that section's content. No YAML, no ':'
punctuation to get wrong -- see the "New template" button, which writes a
blank one of these to fill in.
"""

import os
import re

FRONT_MATTER_RE = re.compile(r'^---\s*\n(.*?\n)---\s*\n?(.*)$', re.DOTALL)
SIMPLE_TAG_RE = re.compile(r'^[ \t]*\[\[[ \t]*(Title|Description|Prompt|Categories|Tags)[ \t]*\]\][ \t]*$',
                            re.IGNORECASE | re.MULTILINE)


class FrontMatterError(ValueError):
    """Raised when a file's front matter can't be parsed."""


def _parse_value(value):
    if value.startswith('[') and value.endswith(']'):
        inner = value[1:-1].strip()
        if not inner:
            return []
        return [v.strip() for v in inner.split(',') if v.strip()]
    return value


def parse_front_matter(text):
    """Parse a prompt file's full text into (metadata_dict, body_str).
    Raises FrontMatterError if there's no valid '---' delimited block,
    or a line inside it has no ':' separator."""
    match = FRONT_MATTER_RE.match(text)
    if not match:
        raise FrontMatterError("No '---' delimited front matter block found")
    raw_yaml, body = match.group(1), match.group(2)
    metadata = {}
    for line_no, line in enumerate(raw_yaml.split('\n'), start=1):
        if not line.strip():
            continue
        if ':' not in line:
            raise FrontMatterError(f"Line {line_no} has no ':' separator: {line!r}")
        key, _, value = line.partition(':')
        metadata[key.strip()] = _parse_value(value.strip())
    return metadata, body.strip('\n')


def parse_simple_tags(text):
    """Parse the hand-written [[Title]]/[[Description]]/[[Prompt]]/
    [[Categories]]/[[Tags]] format into the same (metadata, body) shape
    parse_front_matter returns. Categories/Tags are comma-separated on one
    or more lines. Raises FrontMatterError if no recognised marker is found
    at all, or [[Prompt]] is missing (there's nothing to use as the body)."""
    matches = list(SIMPLE_TAG_RE.finditer(text))
    if not matches:
        raise FrontMatterError("No [[Title]]/[[Prompt]]/etc. section markers found")
    sections = {}
    for i, m in enumerate(matches):
        key = m.group(1).lower()
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        sections[key] = text[start:end].strip()
    if 'prompt' not in sections:
        raise FrontMatterError("Missing [[Prompt]] section")
    categories = [c.strip() for c in sections.get('categories', '').replace('\n', ',').split(',') if c.strip()]
    tags = [t.strip() for t in sections.get('tags', '').replace('\n', ',').split(',') if t.strip()]
    metadata = {
        'title': sections.get('title', ''),
        'description': sections.get('description', ''),
        'category': categories[0] if categories else '',
        'tags': tags,
    }
    return metadata, sections['prompt']


def _simple_tag_template():
    """The blank template written by the "New template" action -- filled in
    by hand in any text editor, then picked up on the next rescan."""
    return """[[Title]]
Untitled Prompt

[[Description]]
Describe what this prompt does and when to use it.

[[Prompt]]
Write your prompt here. Use {{variable_name}} for fill-in variables.

[[Categories]]
General

[[Tags]]
example
"""


def scan_vault(vault_path):
    """Walk vault_path for .md files (skipping dot-folders like
    .promptvault), parse each one, return a list of dicts:
    {relative_path, metadata, body, error}. error is None on success, a
    message string on parse failure -- the file is still listed, not
    dropped, per the spec's 'unrecognised, not hidden' rule."""
    results = []
    for root, dirs, files in os.walk(vault_path):
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        for filename in sorted(files):
            if not filename.endswith('.md'):
                continue
            full_path = os.path.join(root, filename)
            rel_path = os.path.relpath(full_path, vault_path)
            try:
                with open(full_path, 'r', encoding='utf-8') as f:
                    text = f.read()
                try:
                    metadata, body = parse_front_matter(text)
                except FrontMatterError:
                    metadata, body = parse_simple_tags(text)
                results.append({
                    'relative_path': rel_path,
                    'metadata': metadata,
                    'body': body,
                    'error': None,
                })
            except FrontMatterError as e:
                results.append({
                    'relative_path': rel_path,
                    'metadata': {},
                    'body': '',
                    'error': str(e),
                })
            except OSError as e:
                results.append({
                    'relative_path': rel_path,
                    'metadata': {},
                    'body': '',
                    'error': f'Read error: {e}',
                })
    return results
