#!/bin/sh

command_arg=$1
shift

case $command_arg in
  scheduler) node src/bin/scheduler.js ;;
  queue) node src/bin/queue.js ;;
  web) node src/bin/web.js ;;
  *) echo "Unsupported command $command_arg"
esac
