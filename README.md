# Conscious Cart 🛒🌿
> **AI-Powered Product Ingredient Scanner & Clean-Label Swapper**  
> *Built with Google AI Studio & Gemini 3 Flash Preview | Deployed on Google Cloud Run*

[![Live Demo](https://img.shields.io/badge/Demo-Live%20Application-brightgreen)](https://conscious-cart-372369002486.us-west1.run.app)
[![Powered By](https://img.shields.io/badge/AI-Google%20AI%20Studio%20%7C%20Gemini%203%20Flash-blue)](https://aistudio.google.com/)
[![Built With](https://img.shields.io/badge/Stack-React%20%2B%20Vite%20%2B%20TypeScript-61DAFB)](https://vitejs.dev/)

---

## 💡 Overview & Problem Statement
Shoppers face confusing marketing claims and dense, microscopic ingredient panels filled with ultra-processed additives, inflammatory seed oils, and endocrine disruptors. 

**Conscious Cart** provides an AI personal shopping companion that scans product labels in real time, parses complex formulations, and recommends cleaner, healthier alternative swaps.

---

## ⚡ Core Capabilities
- **Multimodal Visual Extraction:** Zero-shot OCR parses curved, glossy, or low-light ingredient panels.
- **Agentic Grounding Tools:** Utilizes Gemini Interactions API equipped with native `google_search` and `url_context` to verify emerging chemical safety data and brand certifications.
- **Deep Cognitive Analysis:** Employs high-level model reasoning (`thinking_level: 'high'`) to evaluate toxicity risks, preservatives, and allergens.
- **Structured JSON Schema:** Direct conversion of raw packaging into standardized, actionable swap cards and color-coded risk indicators.

---

## 🏗️ Architecture

```text
[ Shopper Mobile / Desktop Camera ]
               │
      (Label Image Upload / Scan)
               ▼
   [ React + Vite UI (App.tsx) ]
               │
    [ services/geminiService.ts ]
               │
               ▼
[ Google AI Studio - Gemini 3 Flash Preview ]
  ├── System Configs (agents/configs.ts)
  ├── Multimodal Analysis (thinking_level: high)
  ├── Tool Grounding: Google Search & URL Context
  └── Structured JSON Output Schema
               │
               ▼
[ Rendered Clean Ingredient Report & Swaps ]


<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1N71tcNa3LEZLsmi_BehlrNEiTdv09MzH

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
