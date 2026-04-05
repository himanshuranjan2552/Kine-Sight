import { CreateWebWorkerMLCEngine, WebWorkerMLCEngine, InitProgressReport } from '@mlc-ai/web-llm';
import type { FormQuality } from '../fitness/poseEngine';

export const SYSTEM_PROMPT = "You are an AI fitness coach. When the user makes a mistake, explain EXACTLY what body part is misaligned and give ONE clear corrective cue. When motivating, be energetic and specific to their progress. Never use markdown, lists, or emojis. Keep it to ONE short sentence.";

// Qwen2.5-1.5B — verified to exist in @mlc-ai/web-llm v0.2.82 registry
const MODEL_ID = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";
const FALLBACK_MODEL_ID = "SmolLM2-1.7B-Instruct-q4f16_1-MLC";

class LLMEngineWrapper {
  private engine: WebWorkerMLCEngine | null = null;
  private initializing = false;
  private generating = false;

  async init(onProgress: (progress: InitProgressReport) => void) {
    if (this.engine || this.initializing) return;
    this.initializing = true;
    try {
      const worker = new Worker(new URL('./llm-worker.ts', import.meta.url), { type: 'module' });
      this.engine = await CreateWebWorkerMLCEngine(worker, MODEL_ID, {
        initProgressCallback: onProgress,
      });
    } catch (err) {
      console.error(`Failed to load primary model (${MODEL_ID}):`, err);
      try {
        const worker2 = new Worker(new URL('./llm-worker.ts', import.meta.url), { type: 'module' });
        this.engine = await CreateWebWorkerMLCEngine(worker2, FALLBACK_MODEL_ID, {
          initProgressCallback: onProgress,
        });
      } catch (e) {
        console.error(`Fallback model (${FALLBACK_MODEL_ID}) also failed:`, e);
        throw e;
      }
    } finally {
      this.initializing = false;
    }
  }

  isReady() {
    return this.engine !== null && !this.generating;
  }

  async generateFeedback(
    exercise: string,
    action: string,
    context: any,
    onChunk: (text: string) => void
  ) {
    if (!this.engine) return "I'm still warming up! Give me a second.";
    if (this.generating) return ""; // Skip if already generating — prevents queue buildup

    this.generating = true;

    const prompt = `Exercise: ${exercise}\nAction: ${action}\nForm Mistakes: ${context.formDetails?.length ? context.formDetails.join(', ') : 'None'}\nRep Number: ${context.repNumber}\nProvide your ONE sentence response without any markdown.`;

    const messages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      { role: "user" as const, content: prompt }
    ];

    try {
      // @ts-ignore - satisfying standard ChatCompletionMessageParam types
      const chunks = await this.engine.chat.completions.create({
        messages,
        temperature: 0.6,
        max_tokens: 60,
        stream: true,
      });

      let fullText = "";
      for await (const chunk of chunks) {
        const delta = chunk.choices[0]?.delta?.content || "";
        fullText += delta;
        onChunk(fullText.trim());
      }
      return fullText.trim();
    } catch (err) {
      console.error("LLM Generation Error:", err);
      const fallbackMsg = "Keep going, you've got this!";
      onChunk(fallbackMsg);
      return fallbackMsg;
    } finally {
      this.generating = false;
    }
  }
}

export const llmService = new LLMEngineWrapper();
