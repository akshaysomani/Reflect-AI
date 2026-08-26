# Aura Reflect AI – Secure AI Journal & Reflection Partner

A full-stack, user-authenticated AI journaling, voice reflection, and weekly synthesis web application built with Google GenAI (`@google/genai`), Express, React, Tailwind CSS, Firebase Authentication, and Cloud Firestore.

---

## 1. Agentic Threat Modeling Summary Table

| Threat Zone | Identified Attack Vector / Scenario | Countermeasure & Defensive Architecture |
| :--- | :--- | :--- |
| **Input Surfaces** | Malicious injection via voice notes, journal prompts, or unescaped HTML payload | Strict payload decoding middleware, schema sanitization, prompt framing, and non-eval native rendering in React. |
| **Planning & Reasoning** | System prompt hijacking or attempts to elicit non-therapeutic harmful clinical advice | Firm empathetic persona system instructions with explicit boundary guardrails and non-clinical mindfulness scopes. |
| **Tool Execution & APIs** | API key exposure, SSRF, or unauthenticated reflection generation | Gemini API keys are strictly confined to the backend server (`server.ts`). Client routes verify ownership context. |
| **Memory & State** | Cross-tenant data exfiltration or unauthorized reading of other users' journals | Zero-trust Cloud Firestore security rules (`request.auth.uid == userId`) with user-isolated subcollections. |
| **Inter-System Communication** | Upstream Gemini API timeouts or rate limits (`429`, `503`, `500`) | Resilient fallback ladder (`gemini-3.6-flash` → `gemini-3.5-flash-lite` → `gemini-3.1-flash-lite` → `gemini-flash-latest` → `gemini-3.7-flash`). |

---

## 2. Cloud Firestore Security Rules

Deploy the following owner-bound rules in `firestore.rules` to enforce strict zero-trust user isolation:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User profile and private reflection subcollections
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /{allSubcollections=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

---

## 3. Secret Manager & Environment Setup

### 3.1 Create and Store Secret in Google Cloud Secret Manager
```bash
# Enable required Google Cloud APIs
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  identitytoolkit.googleapis.com

# Create the GEMINI_API_KEY secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Grant the Cloud Run default service account Secret Accessor permissions
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 4. Google Cloud Run Deployment

Deploy the full-stack container directly using `gcloud run deploy`:

```bash
# Build and deploy to Cloud Run
gcloud run deploy aura-reflect-ai \
  --source . \
  --platform managed \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --set-env-vars NODE_ENV=production

# Apply mandatory campaign verification label
gcloud run services update aura-reflect-ai \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=asia-southeast1
```

---

## 5. Functional Walkthrough & Testing Protocol

### Test Case 1: Authentication & Zero-Trust Access
1. Visit the landing page. Notice unauthenticated users cannot access dashboard metrics or past reflection records.
2. Click **"Continue with Google Account"** (or **"Explore as Mindful Guest"** for instant sandbox testing).
3. Confirm the session switches to the private dashboard with the user's name and ownership badge.

### Test Case 2: Multi-Turn AI Reflection Dialog
1. On the dashboard, click **"Start New Reflection"** or select a prompt starter (e.g., *Untangling Anxiety & Overwhelm*).
2. Type an initial thought: `"I felt overwhelmed with multiple conflicting priorities at work today."`
3. Click **"Send Thought"**. Verify Gemini responds with empathy, cognitive reframing, and an open inquiry.
4. Reply with an answer to Gemini's question. Confirm the multi-turn conversational history is maintained.

### Test Case 3: Voice Note Journaling & AI Polish
1. In the Reflection Studio, click **"Record Voice"**.
2. Speak your reflections into the microphone. Observe the active listening indicator and live transcript capture.
3. Click **"Stop Voice Note"** and click **"Polish Prose"** to format speech into polished journal prose.

### Test Case 4: Automated Sentiment Analysis & Persistence
1. In the active session, click **"Finish & Extract Insights"**.
2. Confirm Gemini extracts a 3-5 word title, primary emotion badge (e.g., *Reflective 🌿*), sentiment score, thematic tags, and 1-sentence takeaway anchor.
3. Edit the title or tags if desired, then click **"Save Reflection to Journal"**.
4. Confirm toast notification and verify the entry appears in both the Dashboard and Past Reflections.

### Test Case 5: History Search, Filter & Dialog Inspection
1. Navigate to **"Past Reflections"** in the top navigation.
2. Filter by mood (e.g., *Peaceful*, *Reflective*) or search by keyword.
3. Click on any reflection card to open the **Reflection Detail Modal** and inspect the full multi-turn dialog.

### Test Case 6: Weekly Emotional Synthesis Generation
1. Navigate to **"Weekly Synthesis"** (or click the banner on the Dashboard).
2. Click **"Generate Weekly Synthesis"**.
3. Verify Gemini aggregates all entries from the past 7 days, charting emotional trajectory, key breakthroughs, and actionable mindfulness habits.
