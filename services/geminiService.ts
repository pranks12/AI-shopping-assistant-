
import { GoogleGenAI } from "@google/genai";
import { AnalysisReport, UserPreferences, Recommendation, AgentConfig } from "../types";
import { AGENT_SCHEMAS } from "../agents/configs";

// Fix: Initializing GoogleGenAI using process.env.API_KEY directly as per guidelines
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const runRouter = async (input: string, config: AgentConfig): Promise<{ route: 'analysis' | 'recommendation', extracted_category?: string }> => {
  const ai = getAI();
  // Fix: promptTemplate is a function, calling it with the user input
  const response = await ai.models.generateContent({
    model: config.model,
    contents: config.promptTemplate(input),
    config: {
      systemInstruction: config.systemInstruction,
      responseMimeType: "application/json",
      responseSchema: AGENT_SCHEMAS.router
    }
  });
  return JSON.parse(response.text);
};

export const runToxinShield = async (
  input: string | { data: string; mimeType: string },
  config: AgentConfig,
  isImage: boolean = false
): Promise<AnalysisReport> => {
  const ai = getAI();
  const textInput = typeof input === 'string' ? input : "Visual product scan";
  
  // Fix: promptTemplate is a function, calling it with the processed text input
  const response = await ai.models.generateContent({
    model: config.model,
    contents: isImage && typeof input !== 'string' 
      ? { parts: [{ inlineData: input }, { text: config.promptTemplate(textInput) }] }
      : config.promptTemplate(textInput),
    config: {
      systemInstruction: config.systemInstruction,
      responseMimeType: "application/json",
      responseSchema: AGENT_SCHEMAS.shield
    }
  });
  return JSON.parse(response.text);
};

export const runPersonalShopper = async (
  context: string,
  prefs: UserPreferences,
  config: AgentConfig
): Promise<{ recommendations: Recommendation[]; sources: any[] }> => {
  const ai = getAI();
  const prefString = JSON.stringify(prefs);

  // Fix: promptTemplate is a function, calling it with context and preferences
  const response = await ai.models.generateContent({
    model: config.model,
    contents: config.promptTemplate(context, prefString),
    config: {
      systemInstruction: config.systemInstruction,
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: AGENT_SCHEMAS.shopper
    }
  });

  // Extract text and parse as JSON. Note: When using googleSearch, the model's text output property is used.
  const data = JSON.parse(response.text);
  const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  return { recommendations: data.recommendations, sources };
};
