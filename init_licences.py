#!/usr/bin/env python3
"""
Initialize the licence table and load keys from a text file.
Run this once to set up the system.
"""

import sqlite3
import os
import sys
import hashlib

def get_data_dir():
    path = os.path.join(os.path.expanduser('~'), 'Documents', 'PromptLibrary')
    os.makedirs(path, exist_ok=True)
    return path

DATABASE = os.path.join(get_data_dir(), 'PromptLibrary.db')

def init_licence_table():
    """Create the licences table if it doesn't exist."""
    conn = sqlite3.connect(DATABASE)
    c = conn.cursor()

    c.execute('''CREATE TABLE IF NOT EXISTS licences (
        id INTEGER PRIMARY KEY,
        key_hash TEXT UNIQUE NOT NULL,
        key_display TEXT NOT NULL,
        is_used INTEGER DEFAULT 0,
        date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        date_activated TIMESTAMP,
        machine_id TEXT
    )''')

    conn.commit()
    conn.close()
    print(f"Licence table initialized at {DATABASE}")

def load_keys_from_file(filename):
    """Load keys from a text file (one per line) into the DB."""
    if not os.path.exists(filename):
        print(f"Error: {filename} not found")
        return 0

    conn = sqlite3.connect(DATABASE)
    c = conn.cursor()

    loaded = 0
    skipped = 0

    with open(filename, 'r') as f:
        for line in f:
            key = line.strip()
            if not key or key.startswith('#'):
                continue

            key_hash = hashlib.sha256(key.upper().encode()).hexdigest()

            try:
                c.execute('''INSERT INTO licences (key_hash, key_display)
                           VALUES (?, ?)''', (key_hash, key))
                loaded += 1
            except sqlite3.IntegrityError:
                skipped += 1

    conn.commit()
    conn.close()

    print(f"Loaded {loaded} keys from {filename}")
    if skipped:
        print(f"Skipped {skipped} duplicate keys")

    return loaded

def count_keys():
    """Count total and used keys."""
    conn = sqlite3.connect(DATABASE)
    c = conn.cursor()

    total = c.execute('SELECT COUNT(*) FROM licences').fetchone()[0]
    used = c.execute('SELECT COUNT(*) FROM licences WHERE is_used = 1').fetchone()[0]
    available = total - used

    conn.close()

    print(f"\nLicence Status:")
    print(f"  Total:     {total}")
    print(f"  Used:      {used}")
    print(f"  Available: {available}")

if __name__ == '__main__':
    init_licence_table()

    if len(sys.argv) > 1:
        filename = sys.argv[1]
        load_keys_from_file(filename)

    count_keys()
