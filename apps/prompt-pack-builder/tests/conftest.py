import os
import sys
import tempfile

# Keep test runs away from the real Documents folder before main.py is imported.
os.environ.setdefault('PPB_DATA_DIR', tempfile.mkdtemp(prefix='ppb-test-'))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
