import { React, useState, useContext, useEffect } from 'react'
import { store } from '../../scripts/store'
import ChatView from './ChatView'
import ChatInput from './ChatInput'

const ChatContainer = ({ sourceIndex }) => {
  const ctxStore = useContext(store)

  const [lastMessage, setLastMessage] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [writeProgress, setWriteProgress] = useState(-1)
  const [firstChatMakesMistakes, setFirstChatMakesMistakes] = useState(true)

  const handleSend = (msg, img) => {
    setLastMessage(msg)
  }

  useEffect(() => {
    setFirstChatMakesMistakes(Math.random() < 0.5)
  }, [sourceIndex])

  return (
    <div className='flex flex-col justify-between overflow-auto w-3/6 h-screen'>
      <div className='flex w-full'>
        <ChatView
          sourceIndex={sourceIndex}
          incomingMessage={lastMessage}
          setIsGenerating={setIsGenerating}
          setWriteProgress={setWriteProgress}
          writeProgress={writeProgress}
          makesMistakes={firstChatMakesMistakes}
        />
        <ChatView
          sourceIndex={sourceIndex}
          incomingMessage={lastMessage}
          setIsGenerating={setIsGenerating}
          setWriteProgress={setWriteProgress}
          writeProgress={writeProgress}
          makesMistakes={!firstChatMakesMistakes}
        />
      </div>
      {ctxStore.state.chatEnabled && (
        <>
          {ctxStore.state.displayChatOnboarding && (
            <div className='flex flex-col justify-center items-center p-16 shadow-lg mb-4 rounded-xl border-8 border-emerald-500 text-black w-full'>
              <p className='text-4xl font-bold'>Try it out!</p>
              <div className='mt-4'>
                <i className='bi bi-arrow-down text-4xl'></i>
                <i className='bi bi-arrow-down text-4xl'></i>
                <i className='bi bi-arrow-down text-4xl'></i>
              </div>
            </div>
          )}
        </>
      )}
      <ChatInput
        preventInput={isGenerating || writeProgress !== -1}
        handleSend={handleSend}
      />
    </div>
  )
}

export default ChatContainer
