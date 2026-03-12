import * as webllm from "@mlc-ai/web-llm"
import { pipeline } from '@xenova/transformers'

const GPU_MODEL = "Llama-3.2-1B-Instruct-q4f16_1-MLC"
const CPU_MODEL = "Xenova/Qwen1.5-0.5B-Chat"

class ChatService {
  constructor() {
    this.engine = null
    this.mode = 'gpu'
    // Modified prompt for extreme conciseness
    this.systemPrompt = "You are the 'Stellar Assistant' (星际导游). Answer in ONE CONCISE SENTENCE in the user's language. Focus only on astronomy facts."
  }

  async isWebGPUSupported() {
    if (!navigator.gpu) return false
    try {
      const adapter = await navigator.gpu.requestAdapter()
      return !!adapter
    } catch (e) {
      return false
    }
  }

  async init(onProgress) {
    if (this.engine) return

    const useGPU = await this.isWebGPUSupported()

    if (useGPU) {
      try {
        this.engine = await webllm.createMLCEngine(GPU_MODEL, {
          initProgressCallback: onProgress,
        })
        this.mode = 'gpu'
        return
      } catch (e) {
        console.error("WebLLM Init failed, falling back to CPU:", e)
      }
    }

    this.mode = 'cpu'
    this.engine = await pipeline('text-generation', CPU_MODEL, {
      progress_callback: (p) => {
        if (p.status === 'progress' && onProgress) {
          onProgress({ progress: p.progress / 100 })
        }
      }
    })
  }

  async chat(messages, onUpdate) {
    if (!this.engine) throw new Error("Assistant not initialized")

    if (this.mode === 'gpu') {
      const fullMessages = [
        { role: "system", content: this.systemPrompt },
        ...messages
      ]
      const chunks = await this.engine.chat.completions.create({
        messages: fullMessages,
        stream: true,
      })
      let fullText = ""
      for await (const chunk of chunks) {
        const content = chunk.choices[0]?.delta?.content || ""
        fullText += content
        if (onUpdate) onUpdate(fullText)
      }
      return fullText
    } else {
      // CPU Mode: Optimized for speed
      let prompt = `<|im_start|>system\n${this.systemPrompt}<|im_end|>\n`
      for (const msg of messages) {
        prompt += `<|im_start|>${msg.role}\n${msg.content}<|im_end|>\n`
      }
      prompt += `<|im_start|>assistant\n`

      const output = await this.engine(prompt, {
        max_new_tokens: 64, // Reduced from 256/128 for speed
        temperature: 0.5, // More deterministic/faster
        do_sample: true,
        callback_function: (beams) => {
          const decoded = this.engine.tokenizer.decode(beams[0].output_token_ids, { skip_special_tokens: true })
          const assistantPart = decoded.split('assistant\n').pop()
          if (onUpdate) onUpdate(assistantPart)
        }
      })
      return output[0].generated_text.split('assistant\n').pop()
    }
  }

  async interrupt() {
    if (this.engine && this.mode === 'gpu') {
      await this.engine.interruptGenerate()
    }
  }
}

export const chatService = new ChatService()
