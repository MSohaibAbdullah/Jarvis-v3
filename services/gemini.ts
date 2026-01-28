
import { GoogleGenAI, Type } from "@google/genai";
import { Project, ChatMessage, ReasoningMode, Thread, GroundingSource } from "../types";

// PROMPT DEFINITION: Professional JARVIS Persona
const SYSTEM_INSTRUCTION = `Persona: You are JARVIS (Just A Rather Very Intelligent System).
Identity: Sovereign technical intelligence interface.
Context: You manage high-level engineering workspaces with multiple data nodes (files).

OPERATIONAL RULES:
1. DATA PRIMACY: Use internal uploaded files as your primary source of truth.
2. CITATION: Reference filenames when using internal data (e.g., [Source: data.pdf]).
3. HYBRID REASONING: If internal data is missing, state it and trigger Google Search.
4. TONE: Sophisticated, technical, efficient, and professional.
5. LANGUAGE: English or Romanized Urdu (Hinglish) as requested.`;

export class GeminiService {
  private getAI() {
    /**
     * The API key must be obtained exclusively from the environment variable process.env.API_KEY.
     * Ensure this is set in your Netlify Environment Variables dashboard.
     */
    if (!process.env.API_KEY) {
      console.warn("JARVIS: process.env.API_KEY is undefined. Ensure the environment protocol is established.");
    }
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async *generateTextStream(
    project: Project,
    thread: Thread,
    prompt: string,
    mode: ReasoningMode
  ) {
    const ai = this.getAI();
    
    const fileParts = project.files.map(f => ({
      inlineData: {
        mimeType: f.type,
        data: f.content.split(',')[1] || f.content
      }
    }));

    // Ensure roles alternate correctly: user, model, user, model...
    // Also limit history to prevent token overflow.
    const historyParts = thread.history.slice(-10).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    const contents = [
      ...historyParts,
      {
        role: 'user',
        parts: [...fileParts, { text: prompt }]
      }
    ];

    // Select model based on task complexity
    const modelName = mode === 'High Reasoning' ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';

    const config: any = {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.1,
      tools: [{ googleSearch: {} }]
    };

    if (mode === 'High Reasoning') {
      // Use higher thinking budget for Pro model
      config.thinkingConfig = { thinkingBudget: 32768 };
    }

    const streamResponse = await ai.models.generateContentStream({
      model: modelName,
      contents: contents as any,
      config
    });

    for await (const chunk of streamResponse) {
      yield {
        text: chunk.text,
        groundingMetadata: chunk.candidates?.[0]?.groundingMetadata
      };
    }
  }

  async processVoiceMessage(
    audioBase64: string, 
    mimeType: string, 
    project: Project,
    thread: Thread
  ): Promise<{ transcription: string; reply: string }> {
    const ai = this.getAI();
    const audioPart = { inlineData: { data: audioBase64, mimeType: mimeType } };
    const fileParts = project.files.map(f => ({
      inlineData: { mimeType: f.type, data: f.content.split(',')[1] || f.content }
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [...fileParts, audioPart, { text: "Analyze audio input based on internal workspace documentation. Return JSON with 'transcription' and 'reply'." }] }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: { 
            transcription: { type: Type.STRING }, 
            reply: { type: Type.STRING } 
          },
          required: ["transcription", "reply"]
        }
      }
    });

    try {
      return JSON.parse(response.text || '{}');
    } catch {
      return { transcription: "Processing...", reply: response.text || "" };
    }
  }

  async generateTitle(history: ChatMessage[]): Promise<string> {
    const ai = this.getAI();
    const text = history.map(m => m.content).join(' ').slice(0, 300);
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a 3-word technical title for: ${text}`,
    });
    return (response.text || "New Node").replace(/[#\*`"']/g, '').trim();
  }

  async generateImage(prompt: string): Promise<string> {
    const ai = this.getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: { imageConfig: { aspectRatio: "1:1" } }
    });
    // Iterate through all parts to find the image part
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error("Generation failure.");
  }
}

export const gemini = new GeminiService();
