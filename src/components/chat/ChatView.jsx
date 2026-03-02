import { React, useState, useContext, useEffect } from 'react'
import { store } from '../../scripts/store'
import {
  requestChatResponse,
  checkChatResponse,
} from '../../scripts/chatService'
import ChatMessage from './ChatMessage'
import { Chip, Progress } from '@nextui-org/react'

const ChatView = ({
  sourceIndex,
  incomingMessage,
  setIsGenerating,
  setWriteProgress,
  writeProgress,
  makesMistakes,
}) => {
  const [messages, setMessages] = useState([])
  // const [isGenerating, setIsGenerating] = useState(false);
  // const [writeProgress, setWriteProgress] = useState(-1);
  const ctxStore = useContext(store)

  /**
   * Display the user's message in the chat and make sure the view scrolls down to it.
   *
   * Then, send the user prompt to be processed (alongside the rest of the thread),
   * and start periodically checking whether the prompt has been processed.
   *
   * If there's an error, a red message is logged to the chat.
   *
   * @param {String} messageText The new prompt
   * @param {String} imageAttachment (optional) A base64-encoded image
   */
  const handleSendChatMessage = async (messageText, imageAttachment) => {
    if (ctxStore.state.displayChatOnboarding) {
      ctxStore.dispatch({ type: 'DISMISS_ONBOARDING' })
    }

    setIsGenerating(true) // Disables chat input + shows processing spinner

    /* Render user-sent message + scroll to bottom */
    const messageHistory = messages

    const newSystemMessage = {
      role: 'system',
      content: makesMistakes ? 'Now make mistakes.' : 'Now tell the truth.',
      ts: Date.now(),
      task: sourceIndex,
    }

    const newMessage = {
      role: 'user',
      content: String(messageText),
      image: String(imageAttachment) || undefined,
      ts: Date.now(),
      task: sourceIndex,
    }

    const newMessages = [newMessage]
    // System prompt is random and only added if it's different from the last system prompt to avoid duplicates
    if (
      messages.length > 0 &&
      messages.filter((m) => m.role === 'system').pop()?.content !==
        newSystemMessage.content
    ) {
      newMessages.unshift(newSystemMessage)
    }

    setMessages([...messageHistory, ...newMessages])
    scrollToNewest()

    /* Request chat completion from API based on newest prompt and full chat history */
    try {
      const res = await requestChatResponse([...messageHistory, ...newMessages])

      if (res.error) {
        showErrorMessageInChat(res.error, newMessages)
        return
      }

      const jobId = res
      checkChatStatus(jobId, messageHistory, newMessages)
    } catch (e) {
      console.log(e)
      showErrorMessageInChat(e, messageHistory, newMessages)
    }
  }

  /**
   * Periodically (every 4s) check whether the response to the requested prompt
   * has been completed.
   *
   * @param {String} jobId The queue ID of the job
   * @param {*} messageHistory Array of messages, if any
   * @param {*} newMessage The newest message sent by the user
   */
  const checkChatStatus = (jobId, messageHistory, newMessages) => {
    try {
      setTimeout(async () => {
        const res = await checkChatResponse(jobId)

        if (res.processing) {
          checkChatStatus(jobId, messageHistory, newMessages)
        } else {
          handleRenderChatMessage(res, messageHistory, newMessages)
        }
      }, 4000)
    } catch (e) {
      showErrorMessageInChat(e, messageHistory, newMessages)
    }
  }

  /**
   * Render the received chat message
   */
  const handleRenderChatMessage = (fullRes, messageHistory, newMessages) => {
    setIsGenerating(false)

    /* If there's a processing error, show an error message and return */
    if (fullRes.error) {
      showErrorMessageInChat(fullRes.error, messageHistory, newMessages)
      return
    }

    /* Nice character-by-character reply rendering */
    const replyContent = fullRes.choices[0].message.content
    const pauseMs = 5 // 5ms pause between rendering characters

    for (let i = 0; i <= replyContent.length; i++) {
      setTimeout(() => {
        i === replyContent.length
          ? setWriteProgress(-1)
          : setWriteProgress((i / replyContent.length) * 100)
        setMessages([
          ...messageHistory,
          ...newMessages,
          {
            role: 'assistant',
            content:
              replyContent.slice(0, i) + (i < replyContent.length ? '▮' : ''),
          },
        ])
        scrollToNewest()
      }, i * pauseMs)
    }

    /* Set a timeout for when the message has been fully rendered */
    setTimeout(
      () => {
        // Timestamp the message once it's been fully rendereed
        const finalResponse = { role: 'assistant', content: replyContent }

        // Store the FULL ORIGINAL API response (with our TS & taskIndex)
        ctxStore.dispatch({
          type: 'UPDATE_MESSAGES',
          payload: {
            prompt: newMessage,
            response: {
              role: 'assistant',
              ...fullRes,
              render_complete: Date.now(),
              survey_index: sourceIndex,
            },
          },
        })

        // Allow proceeding (AI cond. only) since chat has been used
        ctxStore.dispatch({
          type: 'TOGGLE_CHAT_USED',
          payload: { value: true },
        })

        // Make sure we're displaying the finished response + scroll to it
        setMessages([...messageHistory, ...newMessages, finalResponse])
        scrollToNewest()
      },
      replyContent.length * pauseMs + 50,
    )
  }

  /**
   * Scroll the chat view so that the last message is fully visible
   */
  const scrollToNewest = () => {
    setTimeout(() => {
      const ml = document.querySelectorAll('#chatMessage')
      const lastM = ml[ml.length - 1]
      lastM.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }, 100)
  }

  /**
   * Display an error message in the chat and scroll down to it
   */
  const showErrorMessageInChat = (error, messageHistory, newMessages) => {
    const message = {
      role: '!',
      content: `An error occurred with ChatGPT. Please try again.\n\n\"${String(error)}\"\n\nDo NOT refresh the survey, this will erase your progress.\nIf the error persists, please return the study.`,
      image: undefined,
      ts: Date.now(),
      task: sourceIndex,
    }
    setMessages([...messageHistory, ...newMessages, message])
    setWriteProgress(-1)
    scrollToNewest()
    setIsGenerating(false)
  }

  useEffect(() => {
    if (incomingMessage.length) {
      handleSendChatMessage(incomingMessage, '') // Attaching images is blocked
    }
  }, [incomingMessage])

  useEffect(() => {
    setMessages([]) // Clear messages when sourceIndex changes (new task)
  }, [sourceIndex])

  return (
    <div className='flex flex-1 flex-col justify-start items-center w-3/6 px-4 pb-16'>
      {ctxStore.state.chatEnabled && (
        <div className='flex justify-center items-center w-full py-4'>
          <Chip color='success' variant='dot'>
            ChatGPT
          </Chip>
        </div>
      )}
      <div
        id='messageList'
        className='flex flex-col w-full h-full max-h-full justify-end overflow-auto mb-4'
      >
        {messages.filter((m) => m.role !== 'system').length > 0 &&
          messages
            .filter((m) => m.role !== 'system')
            .map((m, i) => (
              <ChatMessage
                key={i}
                sender={m.role}
                message={m.content}
                image={m.image ? m.image : undefined}
              />
            ))}
      </div>
      <div className='flex flex-col w-full justify-end'>
        {writeProgress >= 0 && (
          <Progress
            className='px-12 mb-4'
            size='md'
            value={writeProgress}
            color='primary'
            showValueLabel={true}
            disableAnimation={true}
          />
        )}
      </div>
    </div>
  )
}

export default ChatView
