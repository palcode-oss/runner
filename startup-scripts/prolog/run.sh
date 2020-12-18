#!/bin/bash

# Prolog container startup script

# Get the timeout passed as an argument from Node.js
TIMEOUT=$1

# Ensure we're using the correct working directory
cd /usr/src/app || exit
clear

printf "\033[0;30mPalCode Runner\n"
swipl --version
printf "\033[0m\n"

printf "\033[0;33mWarning: Prolog support is highly experimental! Expect buggy behaviour and slow load times.\033[0m\n"
echo

timeout --foreground "$TIMEOUT" swipl main.pl
