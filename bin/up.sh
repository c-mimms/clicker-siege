#!/bin/bash
set -e

# Path to the project root
# Script is in bin/, project root is ..
BIN_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$BIN_DIR/.." && pwd)"
TERRAFORM_DIR="$PROJECT_ROOT/terraform"

echo "Packaging application..."
cd "$PROJECT_ROOT"
# Exclude node_modules, .git, terraform, and the bin folder itself
zip -r app.zip . -x "node_modules/*" ".git/*" "terraform/*" "bin/*" "app.zip"

echo "Uploading package to S3..."
BUCKET="clicker-siege-code-302205098862"
aws s3 cp app.zip s3://$BUCKET/app.zip

echo "Generating pre-signed URL..."
APP_ZIP_URL=$(aws s3 presign s3://$BUCKET/app.zip --expires-in 3600)

echo "Initializing and applying Terraform..."
cd "$TERRAFORM_DIR"
terraform init
terraform apply -auto-approve -var="app_zip_url=$APP_ZIP_URL"

# Get the instance ID and ensure it is started
instance_id=$(terraform output -raw instance_id)
# Strip any ANSI color codes or extra whitespace
instance_id=$(echo "$instance_id" | sed "s/\[[0-9;]*m//g" | xargs)

if [ -n "$instance_id" ] && [ "$instance_id" != "No outputs found" ]; then
    echo "Ensuring instance $instance_id is started..."
    aws ec2 start-instances --instance-ids "$instance_id"
fi

echo "Clicker Siege is now starting up!"
