#!/usr/bin/env python3
"""
Generate PROMPTLIB-PRO licence keys.
Format: PROMPTLIB-PRO-XXXX-XXXX-XXXX (5 segments, 4 chars each, A-Z0-9)
"""

import random
import string

def generate_key():
    """Generate a single licence key."""
    chars = string.ascii_uppercase + string.digits
    segments = [
        ''.join(random.choices(chars, k=4))
        for _ in range(3)
    ]
    return 'PROMPTLIB-PRO-' + '-'.join(segments)

def generate_batch(count=100, filename=None):
    """Generate a batch of keys."""
    keys = [generate_key() for _ in range(count)]

    if filename:
        with open(filename, 'w') as f:
            f.write('\n'.join(keys))
        print(f"Generated {count} keys → {filename}")
    else:
        for key in keys:
            print(key)

    return keys

if __name__ == '__main__':
    import sys

    if len(sys.argv) > 1:
        try:
            count = int(sys.argv[1])
        except ValueError:
            count = 100
    else:
        count = 100

    filename = f'keys_batch_{count}.txt' if count > 10 else None
    generate_batch(count, filename)
