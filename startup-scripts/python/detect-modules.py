from os import listdir
from os.path import isfile, join
import ast
import sys
import importlib

# filter items in this directory to only show files
files = [f for f in listdir('/usr/src/app') if isfile(join('/usr/src/app', f))]
imports = []

for file_name in files:
  if file_name.endswith('.py'):
    f = open(join('/usr/src/app', file_name))
    # use AST to statically parse the Python file.
    # this line will crash in the event of a syntax error
    file_contents = ast.parse(f.read())

    # the code is split into 'nodes'.
    for node in ast.iter_child_nodes(file_contents):
      # python has two types of imports: import a, b, c... and from ... import a, b, c ...
      if isinstance(node, ast.Import):
        # this type allows us to import multiple modules, so we need to add them to our list individually
        for subnode in node.names:
          imports.append(subnode.name)
      elif isinstance(node, ast.ImportFrom):
        # this type just imports one module, but destructures it into its components
        # we just care about the actual module we need to install
        imports.append(node.module)

remote_imports = []
for module_name in imports:
  # if the module refers to a user-created python file, we don't need to install it
  if module_name + '.py' not in files:
    try:
      # if we can import it without crashing, it's a built-in module (e.g. os, ast, itertools)
      importlib.import_module(module_name)
    except:
      # if it isn't a local file, and it can't be imported without crashing, it's probably a PyPI module
      # if the user has just entered gibberish, the startup script will crash before the code runs — which is fine
      remote_imports.append(module_name)

# write our requirements to requirements.txt
# we don't need to query version numbers because:
#   a) PalCode isn't for industrial projects that need stability
#   b) Making network requests on every single run would be slow and consume bandwidth
with open('/usr/src/app/requirements.txt', 'w') as f:
  for module_name in remote_imports:
    # when importing some modules, you can destructure the import using a .
    # this won't resolve when installing via pip, so we need to find the first part of the string
    if '.' in module_name:
      module_name = module_name.split('.')[0]
    f.write(module_name + "\n")

# this is how we tell our shell script whether to create/keep the environment, or to destroy it
if len(remote_imports) != 0:
  print('YES')
  sys.exit(0)
else:
  print('NO')
  sys.exit(0)
