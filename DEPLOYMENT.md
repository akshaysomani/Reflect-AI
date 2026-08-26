# Reflect-AI: Production Cloud Run Deployment & Architecture Guide

This guide details the complete production architecture, deployment procedure, and verification steps for **Reflect-AI** using **Google Cloud Run** for the Express backend and **Vercel** for the React/Vite frontend.

---

## 1. System Architecture

```
                                +-----------------------------------+
                                |     Vercel Production Frontend    |
                                |     (React + TypeScript + Vite)   |
                                |  https://reflect-ai-xi-three.     |
                                |           vercel.app              |
                                +-----------------+-----------------+
                                                  |
                    HTTPS API Requests            | (Authorization: Bearer <Firebase_ID_Token>)
                    (VITE_API_BASE_URL)           | (Origin: https://reflect-ai-xi-three.vercel.app)
                                                  v
                                +-----------------+-----------------+
                                |      Google Cloud Run Backend     |
                                |      (Containerized Express)      |
                                |    - PORT: $PORT (0.0.0.0)        |
                                |    - Strict Origin CORS           |
                                |    - Firebase Admin Token Verify  |
                                +--------+--------+--------+--------+
                                         |        |        |
             +---------------------------+        |        +---------------------------+
             |                                    |                                    |
             v                                    v                                    v
+------------------------+           +------------------------+           +------------------------+
| Google Cloud Secret    |           | Google GenAI Gemini    |           | Cloud Firestore        |
| Manager                |           | API (Flash Ladder)     |           | (User Isolated Data)   |
| (GEMINI_API_KEY)       |           |                        |           | rules_version = '2'    |
+------------------------+           +------------------------+           +------------------------+
```

---

## 2. Prerequisites & GCP Setup

### 2.1 Authenticate and Set Project
```bash
# 1. Log in to Google Cloud
gcloud auth login

# 2. Set your active Google Cloud project ID
gcloud config set project YOUR_PROJECT_ID
```

### 2.2 Enable Required Google Cloud APIs
```bash
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com
```

---

## 3. Secret Manager & Service Account Configuration

### 3.1 Create the Secret for Gemini API Key
```bash
# Create secret in Secret Manager
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"

# Add secret version with your Gemini API key (replace YOUR_ACTUAL_GEMINI_KEY)
echo -n "YOUR_ACTUAL_GEMINI_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-
```

### 3.2 Configure Dedicated Service Account (Least Privilege)
```bash
# Create dedicated service account for Cloud Run
gcloud iam service-accounts create reflect-ai-runner \
  --display-name="Reflect-AI Cloud Run Runner"

# Grant permission to read GEMINI_API_KEY secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:reflect-ai-runner@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 4. Build and Deploy Backend to Cloud Run

### 4.1 Create Artifact Registry Repository
```bash
gcloud artifacts repositories create reflect-ai-repo \
  --repository-format=docker \
  --location=us-central1 \
  --description="Reflect-AI Container Repository"
```

### 4.2 Build and Push Container Image via Cloud Build
```bash
# Run build submission from repository root
gcloud builds submit \
  --tag us-central1-docker.pkg.dev/YOUR_PROJECT_ID/reflect-ai-repo/reflect-ai-backend:latest
```

### 4.3 Deploy Service to Cloud Run
```bash
gcloud run deploy reflect-ai-backend \
  --image us-central1-docker.pkg.dev/YOUR_PROJECT_ID/reflect-ai-repo/reflect-ai-backend:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --service-account reflect-ai-runner@YOUR_PROJECT_ID.iam.gserviceaccount.com \
  --set-env-vars NODE_ENV=production,FRONTEND_URL="https://reflect-ai-xi-three.vercel.app,http://localhost:5173,http://localhost:3000",FIREBASE_PROJECT_ID="gen-ai-cohort-3-defb5" \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest
```

After deployment, `gcloud` will output the HTTPS service URL, for example:
```
Service URL: https://reflect-ai-backend-xxxxxx-uc.a.run.app
```

---

## 5. Configure Vercel Frontend

1. Go to your **Vercel Dashboard** -> select your project **Reflect-AI** (`reflect-ai-xi-three.vercel.app`).
2. Navigate to **Settings** -> **Environment Variables**.
3. Add the following variable:
   - **Key**: `VITE_API_BASE_URL`
   - **Value**: `https://<YOUR-CLOUD-RUN-SERVICE-URL>` (e.g., `https://reflect-ai-backend-xxxxxx-uc.a.run.app`)
   - **Target**: Production, Preview, Development
4. **Trigger a new Deployment** in Vercel (or push a commit / click **Redeploy** on the latest deployment) so Vite picks up the new environment variable during build.

---

## 6. Local Testing Commands

### 6.1 Local Development Mode
```powershell
# Run fullstack Vite + Express development server
npm run dev
```

### 6.2 Local Production Build & Simulation
```powershell
# Build Vite frontend and bundle Express server into dist/server.cjs
npm run build

# Run production bundle locally
$env:PORT="3000"
$env:NODE_ENV="production"
$env:GEMINI_API_KEY="your-gemini-key-for-local-testing"
node dist/server.cjs
```

---

## 7. Verification Guide

### 7.1 Verify Health Check (`/api/health`)
```bash
curl -i https://<CLOUD_RUN_SERVICE_URL>/api/health
```
**Expected Response (HTTP 200 OK):**
```json
{
  "status": "ok",
  "service": "reflect-ai-backend",
  "environment": "production",
  "timestamp": "2026-08-26T15:30:00.000Z",
  "geminiConfigured": true,
  "firebaseAdminConfigured": true
}
```

### 7.2 Verify Multi-turn Reflection Chat (`/api/chat/reflect`)
```bash
curl -X POST https://<CLOUD_RUN_SERVICE_URL>/api/chat/reflect \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"sender": "user", "text": "I feel slightly stressed with new deadlines today."}
    ],
    "userName": "Akshay"
  }'
```
**Expected Response:** HTTP 200 with empathetic AI reflection response.

### 7.3 Verify Sentiment Analysis (`/api/analyze/sentiment`)
```bash
curl -X POST https://<CLOUD_RUN_SERVICE_URL>/api/analyze/sentiment \
  -H "Content-Type: application/json" \
  -d '{
    "rawText": "I took a long walk this evening and realized how important peace of mind is to my productivity."
  }'
```
**Expected Response:** HTTP 200 with structured JSON (`title`, `primaryEmotion`, `emotionEmoji`, `sentimentScore`, `tags`, `oneSentenceTakeaway`).

### 7.4 Verify Weekly Synthesis (`/api/synthesis/weekly`)
```bash
curl -X POST https://<CLOUD_RUN_SERVICE_URL>/api/synthesis/weekly \
  -H "Content-Type: application/json" \
  -d '{
    "entries": [
      {
        "id": "e1",
        "title": "Mindful Walk",
        "primaryEmotion": "Peaceful",
        "sentimentScore": 0.8,
        "oneSentenceTakeaway": "Peace brings focus.",
        "tags": ["Mindset", "Health"]
      }
    ]
  }'
```

### 7.5 Verify Voice Transcription / Prose Clean (`/api/transcribe`)
```bash
curl -X POST https://<CLOUD_RUN_SERVICE_URL>/api/transcribe \
  -H "Content-Type: application/json" \
  -d '{
    "rawSpeech": "um yeah so today i was thinking like maybe i should take a short break"
  }'
```

### 7.6 Verify Firestore Strict Isolation
Inspect [firestore.rules](file:///c:/Users/Akshay/OneDrive/Desktop/Cohort%203/Reflect-AI/firestore.rules):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      match /{allSubcollections=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```
**Isolation Guarantee**:
- User A with UID `user_A` can only read/write documents located under `/users/user_A/...`.
- Any attempt by User B (`user_B`) to query or modify `/users/user_A/...` is rejected at the Firestore security rule evaluation layer (`request.auth.uid == userId` evaluates to `false`).

---

## 8. Security Review Checklist

| Security Requirement | Status | Implementation Detail |
|---|---|---|
| **No Hardcoded Secrets** | PASS | No API keys committed in repository. |
| **No Secrets in Frontend Bundle** | PASS | Gemini API key never imported or referenced in Vite/client codebase. |
| **Secret Manager Integration** | PASS | Secrets injected at runtime using Cloud Run `--set-secrets`. |
| **Least Privilege IAM** | PASS | Runner service account granted only `roles/secretmanager.secretAccessor`. |
| **Firebase Auth Token Verification** | PASS | Backend validates ID tokens using Firebase Admin SDK on incoming requests. |
| **Firestore Isolation** | PASS | Rules enforce `request.auth.uid == userId` across all subcollections. |
| **Restricted CORS** | PASS | Configured for Vercel production origin and local origins; no unrestricted wildcard. |
| **Safe Error Handling** | PASS | Internal server error traces and secrets are masked in production responses. |
| **Health Check Safety** | PASS | `/api/health` reports status without exposing secret values or credentials. |
