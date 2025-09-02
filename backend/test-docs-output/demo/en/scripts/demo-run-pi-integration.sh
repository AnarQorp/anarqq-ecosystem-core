#!/bin/bash
# Pi Network Integration Demo Script

set -e

echo "Running Pi Network Integration..."

# Set variables
SCENARIO="pi-integration"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="artifacts/demo/logs/${SCENARIO}-${TIMESTAMP}.log"

# Create logs directory
mkdir -p artifacts/demo/logs

# Execute scenario
echo "Starting scenario ${SCENARIO}..." | tee ${LOG_FILE}

node scripts/demo/execute-scenario.mjs \
  --scenario=${SCENARIO} \
  --timestamp=${TIMESTAMP} \
  --log-file=${LOG_FILE} \
  "$@"

echo "Scenario completed: ${SCENARIO}" | tee -a ${LOG_FILE}
