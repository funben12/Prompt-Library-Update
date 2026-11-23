"""Runs the Flask app against a throwaway home folder for browser tests. Run: python serve.py PORT"""
import os, sys, tempfile
HOME = tempfile.mkdtemp(prefix='pl-ctx-')
os.environ['HOME'] = HOME
os.environ['USERPROFILE'] = HOME
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
import app as A
assert A.DATABASE.startswith(HOME), 'refusing to run against a real library'
A.init_db()
A.app.run(host='127.0.0.1', port=int(sys.argv[1]), threaded=True, use_reloader=False)
