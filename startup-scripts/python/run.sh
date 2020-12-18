#!/bin/bash

# Python container startup script
source /opt/common/common.sh

# Get the timeout passed as an argument from Node.js
TIMEOUT=$1

# Ensure we're using the correct working directory
cd /usr/src/app || exit
clear

# the detect-modules.py file uses the Python AST module to browse each file and find import nodes
# this is _guaranteed_ to work, as it uses the same Python interpreter as real python code
# if the user's code contains syntax errors, detect-modules.py will crash, in which case we can just ignore it
# detect-modules.py also adds any unknown modules to requirements.txt, ready for pip to install when we get there
USING_IMPORTS=$(python /opt/runner/detect-modules.py 2>/dev/null) || syntax_err "python main.py"
if [[ $USING_IMPORTS == 'YES' ]] ; then
  # intro text if modules haven't been used in the package before
  modules_info

  # If the venv directory doesn't exist, create it
  if [ ! -d "env" ] ; then
    echo "Setting up environment..."
    python -m venv --system-site-packages /usr/src/app/env 2>/dev/null
  fi

  # activate venv
  source env/bin/activate 2>/dev/null || delete_env

  # Only install requirements if they've changed
  if [ -z "$(diff requirements.txt requirements.old.txt 2>/dev/null)" ] && [ -f "requirements.old.txt" ] ; then
    clear
  else
    if grep -q '[^[:space:]]' < requirements.txt 2>/dev/null ; then
      echo "Installing new modules. One moment..."
      pip install -r requirements.txt 2>/dev/null
      # save this version of requirements.txt so we can compare it on the next run
      cp requirements.txt requirements.old.txt >/dev/null 2>/dev/null || true

      clear
      echo "Module installation complete! Refresh PalCode to see the updated requirements.txt file."
      echo
    else
      delete_env
    fi
  fi
else
  delete_env
fi

PYTHON_VERSION=$(python --version)
printf "\033[0;30mPalCode Runner — %s\033[0m \n" "$PYTHON_VERSION"

timeout --foreground "$TIMEOUT" python main.py
