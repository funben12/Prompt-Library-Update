# ============================================================
#  LICENCE VERIFICATION API
#  Add these routes to app.py at the end (before if __name__)
# ============================================================

import hashlib
from datetime import datetime

@app.route('/api/licence/validate', methods=['POST'])
def validate_licence():
    """
    Validate a licence key.
    POST body: {"key": "PROMPTLIB-PRO-XXXX-XXXX-XXXX"}
    Returns: {
        "valid": bool,
        "message": str,
        "already_activated": bool (if key is already in use on this machine)
    }
    """
    data = _json_body()
    key = (data.get('key') or '').strip()

    if not key:
        return jsonify({'valid': False, 'message': 'Key required'}), 400

    key_hash = hashlib.sha256(key.upper().encode()).hexdigest()
    db = get_db()

    # Look up the key
    row = db.execute(
        'SELECT * FROM licences WHERE key_hash = ?',
        (key_hash,)
    ).fetchone()

    if not row:
        return jsonify({
            'valid': False,
            'message': 'Invalid licence key'
        }), 400

    # Key exists. Check if it's already used
    if row['is_used']:
        # Check if it was used on this machine
        machine_id = get_setting('machine_id')
        if row['machine_id'] == machine_id:
            return jsonify({
                'valid': True,
                'message': 'Licence already activated on this machine',
                'already_activated': True
            })
        else:
            return jsonify({
                'valid': False,
                'message': 'This licence key is already in use on another machine'
            }), 400

    # Key is valid and unused. Activate it.
    machine_id = get_setting('machine_id') or 'unknown'
    now = datetime.utcnow().isoformat() + 'Z'

    db.execute('''UPDATE licences
                  SET is_used = 1, date_activated = ?, machine_id = ?
                  WHERE key_hash = ?''',
               (now, machine_id, key_hash))
    db.commit()

    # Store the key locally so the app knows it's licensed
    set_setting('licence_key', key)
    set_setting('licence_activated', now)

    return jsonify({
        'valid': True,
        'message': 'Licence activated successfully',
        'already_activated': False
    })


@app.route('/api/licence/status', methods=['GET'])
def licence_status():
    """
    Check if this machine has a valid licence.
    Returns: {
        "licensed": bool,
        "key": str (masked, last 4 chars only),
        "activated": str (ISO timestamp)
    }
    """
    key = get_setting('licence_key')
    activated = get_setting('licence_activated')

    if key and activated:
        masked_key = key[:10] + '*' * (len(key) - 14) + key[-4:]
        return jsonify({
            'licensed': True,
            'key': masked_key,
            'activated': activated
        })
    else:
        return jsonify({
            'licensed': False,
            'key': None,
            'activated': None
        })


@app.route('/api/admin/licence/count', methods=['GET'])
def admin_licence_count():
    """
    Admin endpoint: count total/used/available keys.
    """
    db = get_db()
    total = db.execute('SELECT COUNT(*) FROM licences').fetchone()[0]
    used = db.execute('SELECT COUNT(*) FROM licences WHERE is_used = 1').fetchone()[0]
    available = total - used

    return jsonify({
        'total': total,
        'used': used,
        'available': available
    })
