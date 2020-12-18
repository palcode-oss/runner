#!/bin/bash

echo "running bash script!"

# Bash script to run other bash scripts

# Get the timeout passed as an argument from Node.js
TIMEOUT=$1

# Ensure we're using the correct working directory
cd /usr/src/app || exit
clear

if [[ ! -x "main.sh" ]]; then
  chmod +x main.sh
fi

printf "\033[0;30mPalCode Runner\n"
bash --version
printf "\033[0m\n"

timeout --foreground "$TIMEOUT" bash main.sh
