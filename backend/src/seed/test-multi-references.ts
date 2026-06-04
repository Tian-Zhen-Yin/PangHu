import axios from 'axios'

const API_BASE_URL = 'http://localhost:3000/api'

async function testMultipleReferences() {
  try {
    // 登录
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      account: 'test@example.com',
      password: 'password123'
    })
    const token = loginResponse.data.data.token

    // 创建对话
    const createConvResponse = await axios.post(
      `${API_BASE_URL}/chat/conversations`,
      { title: '多文档测试', firstMessage: '小猫应该如何照顾？' },
      { headers: { 'Authorization': `Bearer ${token}` } }
    )
    const conversationId = createConvResponse.data.data.id

    // 发送问题 - 这个问题可能引用多个文档
    const chatResponse = await axios.post(
      `${API_BASE_URL}/chat/messages`,
      { conversationId, content: '新生小猫如何保暖和喂养？' },
      { headers: { 'Authorization': `Bearer ${token}` } }
    )

    console.log('📝 回答内容:')
    console.log(chatResponse.data.data.message.content)
    console.log('\n📚 参考文献提取:')

    // 提取参考来源部分
    const content = chatResponse.data.data.message.content
    const refMatch = content.match(/参考来源：.*/)
    if (refMatch) {
      console.log(refMatch[0])
    }

  } catch (error: any) {
    console.error('❌ 测试失败:', error.message)
  }
}

testMultipleReferences()
