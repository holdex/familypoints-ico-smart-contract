#!/bin/bash

# Executes cleanup function at script exit.
trap cleanup EXIT

cleanup() {
  # Kill the ganache-cli instance that we started (if we started one).
  if [ -n "$ganache_cli_pid" ]; then
    kill -9 $ganache_cli_pid
  fi
}

ganache_cli_running() {
  nc -z localhost 8444
}

if ganache_cli_running; then
  echo "Using existing ganache-cli instance"
else
  echo "Starting ganache-cli to run unit tests"
  # We define 10 accounts with balance 1M ether, needed for high-value tests.
  ./node_modules/.bin/ganache-cli --gasLimit 0xfffffffffff --port 8444 \
    --account="0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501200,1000000000000000000000000" -u 0 \
    --account="0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501201,1000000000000000000000000" -u 1 \
    --account="0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501202,1000000000000000000000000" -u 2 \
    --account="0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501203,1000000000000000000000000" -u 3 \
    --account="0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501204,1000000000000000000000000" -u 4 \
    --account="0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501205,1000000000000000000000000" -u 5 \
    --account="0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501206,1000000000000000000000000" -u 6 \
    --account="0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501207,1000000000000000000000000" -u 7 \
    --account="0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501208,1000000000000000000000000" -u 8 \
    --account="0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501209,1000000000000000000000000" -u 9 \
  > /dev/null &
  ganache_cli_pid=$!
fi

./node_modules/.bin/truffle test
