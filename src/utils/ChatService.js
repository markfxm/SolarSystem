import * as webllm from "@mlc-ai/web-llm"

const SELECTED_MODEL = "Llama-3.2-1B-Instruct-q4f16_1-MLC"

class ChatService {
  constructor() {
    this.engine = null
    this.modelId = SELECTED_MODEL
    this.systemPrompt = "You are the 'Stellar Assistant' (星际导游), an expert on the solar system and astronomy. You are helpful, knowledgeable, and enthusiastic about space exploration. Answer the user's questions about planets, stars, and the cosmos in a clear and engaging way. Keep your answers relatively concise but informative."
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

    this.engine = await webllm.createMLCEngine(this.modelId, {
      initProgressCallback: onProgress,
    })
  }

  async chat(messages, onUpdate) {
    if (!this.engine) {
      throw new Error("Engine not initialized")
    }

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
    if (this.engine) {
      await this.engine.interruptGenerate()
    }
  }
}

export const chatService = new ChatService()
