
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

export const analyzeProduct = async (base64Data: string, mimeType: string): Promise<AnalysisResult> => {
  // Always use process.env.API_KEY directly for initialization
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        },
        {
          text: "Analyze the sustainability of this product based on its packaging and labels. If this is a video, scan the entire packaging shown. Look for greenwashing signs, certifications (or lack thereof), and material composition. Provide a structured analysis."
        }
      ]
    },
    config: {
      // Adding persona as system instruction
      systemInstruction: "You are a Senior Environmental Auditor and Greenwashing Whistleblower. Your goal is to analyze product packaging images or videos to detect misleading marketing ('greenwashing') and verify sustainability claims. Provide a Sustainability Score from 0-100, list any Greenwashing Alerts, and give a final 'Buy' or 'Avoid' verdict based on scientific evidence and visible certifications.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          productName: { type: Type.STRING },
          sustainabilityScore: { 
            type: Type.INTEGER, 
            description: "A score from 0 to 100 where 100 is perfectly sustainable" 
          },
          redFlags: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "List of concerning factors or greenwashing indicators"
          },
          positives: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "Environmentally friendly features or certifications"
          },
          recommendation: { type: Type.STRING },
          summary: { type: Type.STRING }
        },
        required: ["productName", "sustainabilityScore", "redFlags", "positives", "recommendation", "summary"]
      }
    }
  });

  // response.text is a property, not a method
  const text = response.text;
  if (!text) throw new Error("No analysis received from AI.");
  
  const parsed = JSON.parse(text);
  return {
    ...parsed,
    id: crypto.randomUUID(),
    timestamp: Date.now()
  } as AnalysisResult;
};
