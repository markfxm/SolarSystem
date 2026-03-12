import * as webllm from "@mlc-ai/web-llm"
import { pipeline } from '@xenova/transformers'

const GPU_MODEL = "Llama-3.2-1B-Instruct-q4f16_1-MLC"
const CPU_MODEL = "Xenova/Qwen1.5-0.5B-Chat" // Tiny and reliable for CPU

class ChatService {
  constructor() {
    this.engine = null
    this.mode = 'gpu'
    this.systemPrompt = "You are the 'Stellar Assistant' (星际导游), an expert on the solar system and astronomy. Answer concisely in the language used by the user."
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

    // Fallback or Force CPU
    this.mode = 'cpu'
    this.engine = await pipeline('text-generation', CPU_MODEL, {
      progress_callback: (p) => {
        if (p.status === 'progress' && onProgress) {
          // Normalize to 0-1 for the UI
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
      // CPU Mode (Transformers.js)
      // Standardize messages to a prompt string (simple template)
      let prompt = `<|im_start|>system\n${this.systemPrompt}<|im_end|>\n`
      for (const msg of messages) {
        prompt += `<|im_start|>${msg.role}\n${msg.content}<|im_end|>\n`
      }
      prompt += `<|im_start|>assistant\n`

      const output = await this.engine(prompt, {
        max_new_tokens: 256,
        temperature: 0.7,
        do_sample: true,
        callback_function: (beams) => {
          const decoded = this.engine.tokenizer.decode(beams[0].output_token_ids, { skip_special_tokens: true })
          // Extract only the new assistant part
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
    // Transformers.js interrupt is complex, skipping for now as CPU models are small
  }
}

export const chatService = new ChatService()
