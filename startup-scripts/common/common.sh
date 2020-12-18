#!/bin/bash

function modules_info () {
  if [ ! -f ".module_info_lock" ] ; then
    touch .module_info_lock
    echo "Hey PalCode user!"
    echo "It looks like you're trying to use modules."
    echo "I'll detect and install any modules for you now — please be patient."
    echo "If you aren't actually using modules, this will probably make you annoyed. Please let Pal know."
    echo && echo
  fi
}

function delete_env () {
  # to keep storage space efficiently packed, remove the entire environment
  rm -rf env requirements.old.txt requirements.txt .module_info_lock node_modules package.json yarn.lock 2>/dev/null
}

function syntax_err () {
  echo "Warning: module detection crashed. No modules could be installed"
  echo "Your code probably contains a syntax error. I'll run it now, so you can see what it is:"
  echo

  # we'll run the code with a super-short timeout, because it should crash instantly anyway
  # if it doesn't crash instantly, it's probably a bug that would keep it running forever
  eval "timeout 3s $1"
  exit
}
