#!/bin/bash

# ChatPM - Google Cloud Run Deployment Script
# ============================================

set -e

# Configuration
PROJECT_ID="${GCP_PROJECT_ID:-your-project-id}"
REGION="${GCP_REGION:-us-central1}"
SERVICE_NAME="chatpm"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

echo "🚀 Deploying ChatPM to Google Cloud Run"
echo "========================================"
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "Service: $SERVICE_NAME"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI not found. Install from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth print-identity-token &> /dev/null; then
    echo "🔑 Please authenticate with Google Cloud:"
    gcloud auth login
fi

# Set project
echo "📋 Setting project to $PROJECT_ID..."
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Create secrets (if they don't exist)
echo "🔐 Setting up secrets..."
echo "   You'll need to set these secrets in Google Cloud Console or via CLI:"
echo "   - chatpm-session-secret"
echo "   - chatpm-google-client-id"
echo "   - chatpm-google-client-secret"
echo "   - chatpm-openai-api-key (optional)"
echo ""

# Build and push image
echo "🏗️  Building Docker image..."
gcloud builds submit --tag $IMAGE_NAME:latest .

# Deploy to Cloud Run
echo "🚢 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
    --image $IMAGE_NAME:latest \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --memory 512Mi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 10 \
    --timeout 300 \
    --set-env-vars "NODE_ENV=production" \
    --set-secrets "SESSION_SECRET=chatpm-session-secret:latest,GOOGLE_CLIENT_ID=chatpm-google-client-id:latest,GOOGLE_CLIENT_SECRET=chatpm-google-client-secret:latest,OPENAI_API_KEY=chatpm-openai-api-key:latest"

# Get service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format 'value(status.url)')

echo ""
echo "✅ Deployment complete!"
echo "🌐 Service URL: $SERVICE_URL"
echo ""
echo "📝 Next steps:"
echo "   1. Update Google OAuth redirect URI to: $SERVICE_URL/auth/google/callback"
echo "   2. Update FRONTEND_URL env var if needed"
echo ""
