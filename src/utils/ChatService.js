import * as webllm from "@mlc-ai/web-llm"

const GPU_MODEL = "Llama-3.2-1B-Instruct-q4f16_1-MLC"
const CPU_MODEL = "Xenova/Qwen1.5-0.5B-Chat"

class ChatService {
  constructor() {
    this.engine = null
    this.worker = null
    this.mode = 'gpu'
    this.systemPrompt = "You are the 'Stellar Assistant' (星际导游). Answer in ONE CONCISE SENTENCE in the user's language. Focus only on astronomy facts."

    // Callbacks for worker
    this.onInitProgress = null
    this.onChatUpdate = null
    this.initResolver = null
    this.chatResolver = null
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
    if (this.engine || this.worker) return

    const useGPU = await this.isWebGPUSupported()

    if (useGPU) {
      try {
        this.engine = await webllm.createMLCEngine(GPU_MODEL, {
          initProgressCallback: onProgress,
        })
        this.mode = 'gpu'
        return
      } catch (e) {
        console.error("WebLLM Init failed, falling back to CPU worker:", e)
      }
    }

    // CPU Mode: Use Web Worker
    this.mode = 'cpu'
    this.onInitProgress = onProgress

    return new Promise((resolve, reject) => {
      this.initResolver = resolve
      this.worker = new Worker(new URL('./chatWorker.js', import.meta.url), { type: 'module' })

      this.worker.onmessage = (e) => {
        const { type, data } = e.data
        if (type === 'init_progress') {
          if (data.status === 'progress' && this.onInitProgress) {
            this.onInitProgress({ progress: data.progress / 100 })
          }
        } else if (type === 'init_complete') {
          resolve()
        } else if (type === 'chat_chunk') {
          if (this.onChatUpdate) {
            const assistantPart = data.split('assistant\n').pop()
            this.onChatUpdate(assistantPart)
          }
        } else if (type === 'chat_complete') {
          if (this.chatResolver) {
            const assistantPart = data.split('assistant\n').pop()
            this.chatResolver(assistantPart)
          }
        } else if (type === 'error') {
          console.error("Worker Error:", data)
          reject(new Error(data))
        }
      }

      this.worker.postMessage({ type: 'init', data: { model: CPU_MODEL } })
    })
  }

  async chat(messages, onUpdate) {
    if (this.mode === 'gpu') {
      if (!this.engine) throw new Error("Assistant not initialized")
      const fullMessages = [{ role: "system", content: this.systemPrompt }, ...messages]
      const chunks = await this.engine.chat.completions.create({ messages: fullMessages, stream: true })
      let fullText = ""
      for await (const chunk of chunks) {
        const content = chunk.choices[0]?.delta?.content || ""
        fullText += content
        if (onUpdate) onUpdate(fullText)
      }
      return fullText
    } else {
      // CPU Mode: Worker Communication
      if (!this.worker) throw new Error("Worker not initialized")
      this.onChatUpdate = onUpdate

      let prompt = `<|im_start|>system\n${this.systemPrompt}<|im_end|>\n`
      for (const msg of messages) {
        prompt += `<|im_start|>${msg.role}\n${msg.content}<|im_end|>\n`
      }
      prompt += `<|im_start|>assistant\n`

      return new Promise((resolve) => {
        this.chatResolver = resolve
        this.worker.postMessage({ type: 'chat', data: { prompt } })
      })
    }
  }

  async interrupt() {
    if (this.mode === 'gpu' && this.engine) {
      await this.engine.interruptGenerate()
    }
    // For worker, we could terminate and restart, but for short sentences it's usually fine
  }
}

export const chatService = new ChatService()
