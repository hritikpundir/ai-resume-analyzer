# AI Resume Analyzer

An AI-powered resume analyzer that gives job seekers both qualitative AI feedback
and a fully reproducible, code-based ATS score — so the scoring isn't a black box.

Upload a resume PDF along with a target job title/description, and the app returns:
- Detailed AI feedback across five categories (ATS fit, tone & style, content, structure, skills)
- A separate **deterministic ATS score**, computed with plain keyword-matching and
  structural checks (no AI involved), so re-analyzing the same resume always gives
  the same result
- Automatic detection of non-resume uploads, so the app doesn't fabricate a score
  for the wrong kind of document

## Tech Stack
- **Frontend:** React 19, TypeScript, React Router 7 (framework mode), Tailwind CSS 4, Zustand
- **PDF handling:** PDF.js — used both to render a preview image and to extract raw
  text client-side (used for AI analysis and for the deterministic scoring layer)
- **Backend-as-a-service:** [Puter.js](https://puter.com) — provides auth, cloud
  file storage, a key-value database, and the AI chat API, all callable directly
  from the frontend with no custom backend server
- **AI model:** accessed via Puter's `ai.chat` API (currently configured to use
  `gpt-4.1-mini`)
- **Build tooling:** Vite, Docker (for containerized deployment)

## Features

**AI-powered resume review**
- Upload a PDF resume, optionally with a target company, job title, and job description
- AI feedback broken into ATS, Tone & Style, Content, Structure, and Skills, each
  with a score and specific tips
- Resume preview generated client-side and shown alongside the feedback

**Deterministic ATS scoring (no AI)**
- Keyword-match score comparing the resume against the job description
- Structural checks: word count, presence of contact details (email/phone),
  and standard resume section headers
- Combined into one score, with the two sub-scores and matched/missing
  keywords shown transparently

**Robustness**
- Detects and rejects non-resume documents instead of generating a fake score
- Defensive parsing of AI responses (handles malformed JSON, unexpected shapes,
  and stray formatting from the model) with clear error states in the UI
- Client-side PDF text extraction, so resume content doesn't depend on a
  third-party service successfully parsing the raw PDF file

**Data & auth**
- Sign-in/auth, file storage, and resume history handled through Puter's cloud APIs
- All uploaded resumes and past analyses are viewable from the home dashboard

## Architecture note

This app intentionally has no custom backend of its own — auth, file storage,
the key-value store, and the AI call are all provided by the Puter.js SDK directly
from the browser. The tradeoffs of this approach (fast to ship, but the AI prompt
and API usage are visible client-side) are a deliberate design choice for this project.