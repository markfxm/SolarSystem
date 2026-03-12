import * as webllm from "@mlc-ai/web-llm"

const GPU_MODEL = "Llama-3.2-1B-Instruct-q4f16_1-MLC"

class ChatService {
  constructor() {
    this.engine = null
    this.mode = 'gpu' // 'gpu'
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

    try {
      // Primary: WebLLM (GPU)
      this.engine = await webllm.createMLCEngine(GPU_MODEL, {
        initProgressCallback: onProgress,
      })
      this.mode = 'gpu'
    } catch (e) {
      console.error("WebLLM Init failed, no fallback implemented yet:", e)
      throw e
    }
  }

  async chat(messages, onUpdate) {
    if (!this.engine) throw new Error("Assistant not initialized")

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
  }

  async interrupt() {
    if (this.engine && this.mode === 'gpu') {
      await this.engine.interruptGenerate()
    }
  }
}

export const chatService = new ChatService()
