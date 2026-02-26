#!/bin/bash
set -e
# Navigate to terraform directory relative to the script
cd "$(dirname "$0")/../terraform"

echo "Checking project status..."
instance_id=$(terraform output -raw instance_id 2>/dev/null || echo "")
if [ -n "$instance_id" ] && [[ "$instance_id" != *"No outputs"* ]]; then
    echo "Stopping instance $instance_id for standby mode..."
    aws ec2 stop-instances --instance-ids "$instance_id"
    echo "Clicker Siege is now in standby."
else
    echo "No instance_id found, nothing to stop."
fi
