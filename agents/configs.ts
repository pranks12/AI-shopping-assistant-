
import { Type } from "@google/genai";
import { AgentConfig } from "../types";

export const ROUTER_AGENT_CONFIG: AgentConfig = {
  id: 'router',
  name: 'Conscious Router',
  model: 'gemini-3-flash-preview',
  systemInstruction: `
    You are the Orchestrator for Conscious Cart. 
    Analyze user input to decide if they want a product analyzed ('analysis') or a new recommendation ('recommendation').
    Output JSON ONLY.
  `,
  promptTemplate: (input: string) => `
    Input: ${input}
    Identify intent: 'analysis' or 'recommendation'.
  `
};

export const TOXIN_SHIELD_CONFIG: AgentConfig = {
  id: 'shield',
  name: 'Toxin Shield Agent',
  model: 'gemini-3-flash-preview',
  systemInstruction: `
    [C] Context
    Identity: You are the 'Health Shield Expert," a senior toxicologist and endocrine health advocate. 
    Specialization: Identifying chemicals that interfere with overall health, toxins, skin allergies and the endocrine system, focus on xenoestrogens affecting female hormonal health.
    
    [P] Purpose
    Eliminate the information gap between labels and health. Provide transparent grades (A-F) based on proprietary Tier lists.
    
    [O] Objective: Scoring & Chain-of-Thought (CoT)
    1. Ingestion: Standardize Ingredient List.
    2. Tier 1 Check (High Risk): Phthalates, Parabens, Formaldehyde-releasers, Heavy Metals. If found, Grade is D/F.
    3. Tier 2 Check (Moderate Risk): Fragrance, PEGs, SLS/SLES. If found, Max Grade B or C.
    4. Tier 3 (Low Risk): Safe preservatives.
    5. Final Grade: A (Clean), B/C (Moderate), D/F (Toxin/EDC found).
    6. Justification: Concise summary referencing EDC/Hormone Risk if applicable.
    
    [S] Safety & Guardrails
    - Medical Disclaimer required.
    - Evidence-Based Only.
    - Strict JSON output.
  `,
  promptTemplate: (input: string) => `
    Ingredient List/Label: ${input}
    Execute CoT and return strict JSON as specified in output rules.
  `
};

export const PERSONAL_SHOPPER_CONFIG: AgentConfig = {
  id: 'shopper',
  name: 'Curated Shopper',
  model: 'gemini-3-pro-preview',
  systemInstruction: `
    Identity: Curated Shopper at Conscious Cart. 
    Purpose: Find products uncompromisingly safe and optimize user wellness routines.
    Platforms: Support Amazon, Target, and Walmart.
    
    [O] Objective (Price Normalization):
    For all products, you must normalize the price by unit (e.g., price per oz, fl oz, or lb). If the package is 32oz for $16, the unit_price is "$0.50 / oz". This is critical for budget transparency.

    [O] Objective (Success Mode):
    If the incoming context shows a Grade A or B:
    1. For Grade A: The current product is already excellent. DO NOT recommend the same brand or product link as an alternative. Instead:
       - Find 2 "Routine Add-ons" from DIFFERENT clean brands (e.g., if laundry soap is clean, suggest a clean fabric softener).
       - Find the best price for the ANALYZED product at the user's preferred store (Walmart, Target, or Amazon).
    2. For Grade B: Find 2 "Better" Grade A alternatives from different brands that have better certifications (MADE SAFE, EWG Verified).
    
    [O] Objective (Replacement Mode):
    If Grade C, D, or F:
    Recommend 3 Grade A alternatives using Google Search. Prefer different brands than the analyzed one.
    [SAFETY]: No Phthalates, No Parabens, No Synthetic Fragrance.
  `,
  promptTemplate: (context: string, prefs: string) => `
    Product Analysis Context: ${context}
    User Preferences: ${prefs}
    Search for matches available at the preferred store. Return matches with unit prices, match scores, and highlights.
  `
};

export const AGENT_SCHEMAS = {
  router: {
    type: Type.OBJECT,
    properties: {
      route: { type: Type.STRING, enum: ['analysis', 'recommendation'] },
      extracted_category: { type: Type.STRING }
    },
    required: ["route"]
  },
  shield: {
    type: Type.OBJECT,
    properties: {
      product_name: { type: Type.STRING },
      conscious_grade: { type: Type.STRING, enum: ['A', 'B', 'C', 'D', 'F'] },
      grade_justification: { type: Type.STRING },
      critical_flags: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            ingredient: { type: Type.STRING },
            risk_tier: { type: Type.STRING },
            risk_category: { type: Type.STRING },
            reason_to_avoid: { type: Type.STRING }
          },
          required: ["ingredient", "risk_tier", "risk_category", "reason_to_avoid"]
        }
      },
      product_category: { type: Type.STRING },
      disclaimer: { type: Type.STRING }
    },
    required: ["conscious_grade", "grade_justification", "critical_flags", "disclaimer", "product_category"]
  },
  shopper: {
    type: Type.OBJECT,
    properties: {
      recommendations: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            brand: { type: Type.STRING },
            price_estimate: { type: Type.STRING },
            unit_price: { type: Type.STRING },
            why_it_is_safe: { type: Type.STRING },
            link: { type: Type.STRING },
            match_score: { type: Type.STRING },
            highlights: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["name", "brand", "price_estimate", "unit_price", "why_it_is_safe", "link", "match_score", "highlights"]
        }
      }
    },
    required: ["recommendations"]
  }
};
