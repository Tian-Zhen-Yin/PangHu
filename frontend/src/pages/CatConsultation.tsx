import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ===== 数据类型 =====

interface CatProfile {
  id: string
  name: string
  breed: string | null
  gender: 'male' | 'female'
  ageMonths: number
  ageFormatted: string
  weight: number | null
  isNeutered: boolean
  allergies: string | null
  diseases: string | null
  recentVaccines: Array<{ name: string; date: string }>
}

type MessageRole = 'user' | 'assistant' | 'system'

interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: Date
  isEmergency?: boolean
  citations?: Array<{ title: string; similarity: number; guideId?: string }>
  askQuestion?: {
    question: string
    options?: string[]  // 预设选项，如果为空则自由输入
    collectedKey?: string  // 这个问题收集的信息键名
  }
  collectedInfo?: Record<string, string>  // 已收集的信息
}

interface ConversationContext {
  catProfileId: string
  symptoms: string[]
  duration?: string
  frequency?: string
  severity?: string
  otherInfo: string[]
}

// ===== 组件 =====

export default function CatConsultation() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: '你好！我是喵喵，专业的猫咪医疗顾问。请问有什么可以帮助您的？',
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [conversationContext, setConversationContext] = useState<ConversationContext>({
    catProfileId: '1',
    symptoms: [],
    otherInfo: [],
  })
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 示例猫咪档案
  const catProfile: CatProfile = {
    id: '1',
    name: '小橘',
    breed: '橘猫',
    gender: 'male',
    ageMonths: 24,
    ageFormatted: '2岁',
    weight: 5.2,
    isNeutered: true,
    allergies: null,
    diseases: null,
    recentVaccines: [
      { name: '猫三联', date: '2024-03-15' },
      { name: '狂犬疫苗', date: '2024-03-15' },
    ],
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // 处理问诊回答
  const handleAskResponse = async (question: string, answer: string, collectedKey?: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: answer,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setIsTyping(true)

    // 更新对话上下文
    if (collectedKey) {
      setConversationContext(prev => ({
        ...prev,
        [collectedKey]: answer,
      }))
    }

    // 调用后端API，传入完整上下文
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: answer,
          conversationContext,
          catProfile,
        }),
      })

      const data = await response.json()
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content,
        timestamp: new Date(),
        isEmergency: data.isEmergency,
        citations: data.citations,
        askQuestion: data.askQuestion,
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('API调用失败:', error)
      // 降级到模拟响应
      setTimeout(() => {
        const mockResponse = {
          content: '**请立即就医！**根据您提供的信息，持续呕吐腹泻超过24小时属于紧急情况。',
          isEmergency: true,
          citations: [{ title: '健康医疗指南', similarity: 0.92, guideId: 'guide-1' }],
        }

        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          ...mockResponse,
          timestamp: new Date(),
        }

        setMessages(prev => [...prev, assistantMessage])
      }, 1000)
    } finally {
      setIsTyping(false)
    }
  }

  // 处理普通消息发送
  const handleSend = async () => {
    if (!inputValue.trim()) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsTyping(true)

    // 调用后端API
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: inputValue,
          conversationContext,
          catProfile,
        }),
      })

      const data = await response.json()

      // 解析响应中的问诊问题
      const askMatch = data.content.match(/<ask>(.*?)<\/ask>/s)
      const cleanContent = data.content.replace(/<ask>.*?<\/ask>/gs, '')

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: cleanContent,
        timestamp: new Date(),
        isEmergency: data.isEmergency,
        citations: data.citations,
        askQuestion: askMatch
          ? {
              question: askMatch[1],
              collectedKey: data.collectedKey,
            }
          : undefined,
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('API调用失败:', error)
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      {/* 顶部导航 */}
      <header className="bg-white/80 backdrop-blur-md border-b border-orange-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-2xl">🐱</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">喵喵</h1>
              <p className="text-sm text-gray-500">专业猫咪医疗顾问</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600">在线</span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 flex gap-6">
        {/* 左侧：猫咪档案 */}
        <aside className="w-72 flex-shrink-0">
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-5 shadow-xl border border-orange-100 sticky top-24">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-300 to-amber-400 rounded-2xl flex items-center justify-center text-3xl shadow-inner">
                🐱
              </div>
              <div>
                <h2 className="font-bold text-gray-800 text-lg">{catProfile.name}</h2>
                <p className="text-sm text-gray-500">{catProfile.breed}</p>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <InfoRow label="性别" value={catProfile.gender === 'male' ? '公猫 ♂' : '母猫 ♀'} />
              <InfoRow label="年龄" value={catProfile.ageFormatted} />
              <InfoRow label="体重" value={catProfile.weight ? `${catProfile.weight}kg` : '未记录'} />
              <InfoRow label="绝育" value={catProfile.isNeutered ? '已绝育' : '未绝育'} />
              {catProfile.allergies && (
                <InfoRow label="过敏" value={catProfile.allergies} highlight />
              )}
              {catProfile.diseases && (
                <InfoRow label="病史" value={catProfile.diseases} highlight />
              )}
            </div>

            {/* 已收集信息 */}
            {Object.keys(conversationContext).filter(k => k !== 'catProfileId').length > 0 && (
              <div className="mt-4 pt-4 border-t border-orange-100">
                <p className="text-xs text-gray-500 mb-2">本次问诊已收集</p>
                {Object.entries(conversationContext)
                  .filter(([k]) => k !== 'catProfileId' && k !== 'otherInfo')
                  .map(([key, value]) => (
                    <div key={key} className="text-xs bg-green-50 rounded-lg px-3 py-2 mb-1.5 border border-green-200">
                      <span className="font-medium text-gray-700">
                        {key === 'duration' ? '持续时长' : key === 'frequency' ? '发作频率' : key}
                      </span>
                      <span className="text-green-700 ml-2 font-medium">{value as string}</span>
                    </div>
                  ))}
              </div>
            )}

            {catProfile.recentVaccines.length > 0 && (
              <div className="mt-4 pt-4 border-t border-orange-100">
                <p className="text-xs text-gray-500 mb-2">近期疫苗</p>
                {catProfile.recentVaccines.map(v => (
                  <div key={v.name} className="text-xs bg-orange-50 rounded-lg px-3 py-2 mb-1.5">
                    <span className="font-medium text-gray-700">{v.name}</span>
                    <span className="text-gray-500 ml-2">{v.date}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* 右侧：聊天区域 */}
        <main className="flex-1 min-w-0">
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-orange-100 overflow-hidden">
            {/* 消息列表 */}
            <div className="h-[calc(100vh-280px)] overflow-y-auto p-6 space-y-4">
              <AnimatePresence>
                {messages.map(message => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    onAskResponse={handleAskResponse}
                  />
                ))}
              </AnimatePresence>

              {/* 输入中提示 */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-gray-400"
                >
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" />
                  </div>
                  <span className="text-sm">喵喵思考中...</span>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* 输入框 - 有问诊问题时隐藏 */}
            {!messages.some(m => m.askQuestion) && (
              <div className="p-4 bg-white/50 border-t border-orange-100">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && handleSend()}
                    placeholder="描述您猫咪的症状或问题..."
                    className="flex-1 px-5 py-3 bg-white rounded-2xl border border-orange-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!inputValue.trim() || isTyping}
                    className="px-6 py-3 bg-gradient-to-r from-orange-400 to-amber-500 text-white rounded-2xl font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
                  >
                    发送
                  </button>
                </div>
                <p className="text-xs text-center text-gray-400 mt-2">
                  ⚠️ 紧急情况请立即就医，本服务仅供参考
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

// ===== 子组件 =====

function MessageBubble({
  message,
  onAskResponse,
}: {
  message: ChatMessage
  onAskResponse: (question: string, answer: string, collectedKey?: string) => void
}) {
  const isUser = message.role === 'user'
  const isEmergency = message.isEmergency
  const hasAsk = message.askQuestion

  const contentHtml = message.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[85%] rounded-3xl ${
          isUser
            ? 'bg-gradient-to-r from-orange-400 to-amber-500 text-white'
            : isEmergency
            ? 'bg-red-50 border-2 border-red-200 text-red-900'
            : hasAsk
            ? 'bg-white border-2 border-blue-200 shadow-lg'
            : 'bg-gray-100 text-gray-800'
        } ${hasAsk ? 'overflow-hidden' : ''}`}
      >
        {/* 问诊卡片头部 */}
        {hasAsk && (
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-3">
            <div className="flex items-center gap-2 text-white">
              <motion.span
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-xl"
              >
                🔍
              </motion.span>
              <span className="font-medium">需要更多了解</span>
            </div>
          </div>
        )}

        <div className="p-5">
          {/* 紧急标记 */}
          {isEmergency && !hasAsk && (
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-red-200">
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="text-lg"
              >
                🚨
              </motion.span>
              <span className="text-sm font-bold text-red-600">紧急情况</span>
            </div>
          )}

          {/* 消息内容 */}
          {contentHtml && (
            <div
              className="text-sm leading-relaxed mb-3"
              dangerouslySetInnerHTML={{ __content__: contentHtml }}
            />
          )}

          {/* 问诊交互卡片 */}
          {hasAsk && (
            <AskInteractionCard
              question={message.askQuestion!.question}
              onResponse={(answer) =>
                onAskResponse(message.askQuestion!.question, answer, message.askQuestion!.collectedKey)
              }
            />
          )}

          {/* 引用来源 */}
          {message.citations && message.citations.length > 0 && !hasAsk && (
            <div className="mt-3 pt-3 border-t border-gray-200/50">
              <p className="text-xs opacity-70 mb-2">参考来源</p>
              <div className="flex flex-wrap gap-2">
                {message.citations.map((citation, i) => (
                  <div
                    key={i}
                    className="inline-flex items-center gap-1.5 text-xs bg-white/50 rounded-full px-3 py-1.5 border border-white/30"
                  >
                    <span>📖</span>
                    <span className="font-medium">{citation.title}</span>
                    <span className={`px-1.5 py-0.5 rounded-full ${
                      citation.similarity > 0.9
                        ? 'bg-green-100 text-green-700'
                        : citation.similarity > 0.8
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {Math.round(citation.similarity * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 时间戳 */}
          <p
            className={`text-xs mt-3 opacity-60 ${
              isUser ? 'text-orange-100' : 'text-gray-500'
            }`}
          >
            {message.timestamp.toLocaleTimeString('zh-CN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

// 问诊交互卡片
function AskInteractionCard({
  question,
  onResponse,
}: {
  question: string
  onResponse: (answer: string) => void
}) {
  const [customAnswer, setCustomAnswer] = useState('')
  const [selectedOption, setSelectedOption] = useState<string | null>(null)

  // 根据问题类型提供快捷选项
  const getQuickOptions = (q: string): string[] => {
    if (q.includes('多久') || q.includes('持续') || q.includes('时间')) {
      return ['不到1天', '1-2天', '3-7天', '超过7天']
    }
    if (q.includes('几次') || q.includes('频率')) {
      return ['1次', '2-3次', '4-5次', '多次/一直']
    }
    if (q.includes('精神') || q.includes('状态')) {
      return ['精神很好', '稍微差一点', '明显萎靡', '非常差']
    }
    return []
  }

  const quickOptions = getQuickOptions(question)

  const handleSubmit = () => {
    const answer = selectedOption || customAnswer
    if (answer.trim()) {
      onResponse(answer)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-blue-50 rounded-2xl p-4 border border-blue-200"
    >
      <p className="font-medium text-blue-900 mb-3 flex items-center gap-2">
        <span className="text-blue-500">●</span>
        {question}
      </p>

      {/* 快捷选项 */}
      {quickOptions.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          {quickOptions.map(option => (
            <button
              key={option}
              onClick={() => {
                setSelectedOption(option)
                setTimeout(() => onResponse(option), 200)
              }}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                selectedOption === option
                  ? 'bg-blue-500 text-white shadow-lg scale-105'
                  : 'bg-white text-blue-700 hover:bg-blue-100 border border-blue-200'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      )}

      {/* 自定义输入 */}
      <div className="flex gap-2">
        <input
          type="text"
          value={customAnswer}
          onChange={e => setCustomAnswer(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && handleSubmit()}
          placeholder={quickOptions.length > 0 ? '或输入其他答案...' : '请输入...'}
          className="flex-1 px-4 py-2.5 bg-white rounded-xl border border-blue-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
        />
        <button
          onClick={handleSubmit}
          disabled={!customAnswer.trim()}
          className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          回答
        </button>
      </div>
    </motion.div>
  )
}

function InfoRow({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div
      className={`flex justify-between items-center py-2 px-3 rounded-xl ${
        highlight ? 'bg-orange-50 border border-orange-200' : ''
      }`}
    >
      <span className="text-gray-500">{label}</span>
      <span className={`font-medium ${highlight ? 'text-orange-700' : 'text-gray-700'}`}>
        {value}
      </span>
    </div>
  )
}
