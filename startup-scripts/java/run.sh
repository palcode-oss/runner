#!/bin/bash

# Java container startup script

# Get the timeout passed as an argument from Node.js
TIMEOUT=$1

# Ensure we're using the correct working directory
cd /usr/src/app || exit
clear

printf "\033[0;30mPalCode Runner\n"
java --version
printf "\033[0m\n"

printf "\033[0;33mWarning: PalCode doesn't support Java dependencies yet! Trying to use Maven packages won't work.\033[0m\n"
echo

timeout --foreground "$TIMEOUT" java Main.java
