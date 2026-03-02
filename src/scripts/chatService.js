const baseURL = import.meta.env.VITE_PROXY_URL
const SYSTEM_PROMPT = import.meta.env.VITE_SYSTEM_PROMPT || ''

/**
 * Request a chat completion based on a list of messages from oldest to newest
 *
 * @param {Array} messages The list of chat messages so far. Should include at least one message (prompt from user).
 * @returns The queued job ID that can be used to check if the prompt has been processed
 * @see checkChatResponse
 */
const requestChatResponse = async (messages) => {
  try {
    const messagesToSend = messages.filter((m) =>
      ['user', 'assistant', 'system'].includes(m.role),
    )
    if (SYSTEM_PROMPT) {
      messagesToSend.unshift({ role: 'system', content: SYSTEM_PROMPT })
    }
    const res = await fetch(`${baseURL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: messagesToSend,
      }),
    })

    const parsed = await res.json()

    if (parsed.error) {
      throw new Error(parsed.error)
    }

    return parsed.jobId
  } catch (e) {
    return { error: e.message }
  }
}

/**
 * Check whether a queued chat completion request has been completed
 *
 * @param {String} jobId The queued job identifier
 * @returns The full API response
 */
const checkChatResponse = async (jobId) => {
  try {
    const res = await fetch(`${baseURL}/check_response`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jobId: String(jobId),
      }),
    })

    const parsed = await res.json()

    if (parsed.error) {
      throw new Error(parsed.error)
    }

    if (!parsed.response) {
      return { processing: true }
    }

    return parsed.response
  } catch (e) {
    return { error: e.message }
  }
}

export { requestChatResponse, checkChatResponse }
