import importlib,traceback,sys
try:
    importlib.import_module('main')
    print('IMPORTED OK')
except Exception:
    traceback.print_exc()
    sys.exit(1)
