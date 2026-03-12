import { pipeline, env } from '@xenova/transformers'

// Skip local model check
env.allowLocalModels = false

let generator = null

self.onmessage = async (e) => {
  const { type, data } = e.data

  if (type === 'init') {
    try {
      generator = await pipeline('text-generation', data.model, {
        progress_callback: (p) => {
          self.postMessage({ type: 'init_progress', data: p })
        }
      })
      self.postMessage({ type: 'init_complete' })
    } catch (err) {
      self.postMessage({ type: 'error', data: err.message })
    }
  } else if (type === 'chat') {
    if (!generator) return

    try {
      const output = await generator(data.prompt, {
        max_new_tokens: 64,
        temperature: 0.5,
        do_sample: true,
        callback_function: (beams) => {
          const decoded = generator.tokenizer.decode(beams[0].output_token_ids, { skip_special_tokens: true })
          self.postMessage({ type: 'chat_chunk', data: decoded })
        }
      })
      self.postMessage({ type: 'chat_complete', data: output[0].generated_text })
    } catch (err) {
      self.postMessage({ type: 'error', data: err.message })
    }
  }
}
