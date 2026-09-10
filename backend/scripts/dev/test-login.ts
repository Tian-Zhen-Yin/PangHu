import axios from 'axios'

async function testLogin() {
  try {
    const response = await axios.post('http://localhost:3000/api/auth/login', {
      account: 'test@example.com',
      password: 'password123'
    })

    console.log('登录响应结构:')
    console.log(JSON.stringify(response.data, null, 2))
  } catch (error: any) {
    console.error('错误:', error.response?.data || error.message)
  }
}

testLogin()
