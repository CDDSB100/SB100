import sys
from _pytest.config import get_config

c = get_config()
# Pytest's Config.parse expects the arguments *excluding* the program name.
# If we include the script path (sys.argv[0]) it can be interpreted as a test
# path and alter rootdir/config discovery, causing pytest.ini to be ignored.
c.parse(sys.argv[1:])
print(f"Python classes: {c.getini('python_classes')}")
print(f"Python files: {c.getini('python_files')}")
print(f"Python functions: {c.getini('python_functions')}")
