
export enum ConsciousGrade {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
  F = 'F'
}

export interface CriticalFlag {
  ingredient: string;
  risk_tier: string;
  risk_category: string;
  reason_to_avoid: string;
}

export interface AnalysisReport {
  conscious_grade: ConsciousGrade;
  grade_justification: string;
  critical_flags: CriticalFlag[];
  product_category: string;
  product_name?: string;
  disclaimer: string;
}

export interface UserPreferences {
  budget: string;
  scent: string;
  platform: string;
  delivery: string;
  zipCode: string;
  additionalAvoidance: string;
  healthConcern: string;
}

export interface Recommendation {
  name: string;
  brand: string;
  price_estimate: string;
  unit_price: string; // e.g., "$0.45 / oz"
  why_it_is_safe: string;
  link: string;
  match_score: string;
  highlights: string[];
}

export interface AgentConfig {
  id: string;
  name: string;
  model: string;
  systemInstruction: string;
  promptTemplate: (...args: any[]) => string;
}

export type AppState = 
  | 'onboarding'
  | 'input' 
  | 'routing' 
  | 'analyzing' 
  | 'report' 
  | 'preference_handoff' 
  | 'searching' 
  | 'recommendations'
  | 'profile'
  | 'history';
