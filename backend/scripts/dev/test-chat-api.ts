/**
 * 端到端测试：模拟前端聊天API调用
 * 测试RAG检索是否在实际API请求中正常工作
 */

import axios from 'axios'

const API_BASE_URL = 'http://localhost:3000/api'

async function testChatAPI() {
  try {
    console.log('🧪 开始端到端测试：聊天API + RAG检索\n')

    // 首先登录获取token
    console.log('1️⃣ 登录获取token...')
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      account: 'test@example.com',
      password: 'password123'
    })

    const token = loginResponse.data.data.token
    console.log('✅ 登录成功\n')

    // 首先创建一个对话
    console.log('2️⃣ 创建新对话...')

    const createConversationResponse = await axios.post(
      `${API_BASE_URL}/chat/conversations`,
      {
        title: '疫苗咨询',
        firstMessage: '小猫什么时候打疫苗？'
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    )

    const conversationId = createConversationResponse.data.data.id
    console.log('✅ 对话创建成功，ID:', conversationId, '\n')

    // 发送聊天消息
    console.log('3️⃣ 发送聊天消息: "小猫什么时候打疫苗？"\n')

    const chatResponse = await axios.post(
      `${API_BASE_URL}/chat/messages`,
      {
        conversationId,
        content: '小猫什么时候打疫苗？'
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        responseType: 'text' // 接收流式响应
      }
    )

    console.log('4️⃣ 聊天响应:\n')
    console.log(chatResponse.data)
    console.log('\n✅ 测试完成')

  } catch (error: any) {
    console.error('❌ 测试失败:', error.message)

    if (error.response) {
      console.error('状态码:', error.response.status)
      console.error('响应数据:', error.response.data)
    }

    process.exit(1)
  }
}

testChatAPI()
