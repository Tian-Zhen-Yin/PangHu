import requests
import json

# 配置你的信息
API_KEY = "054f0cb0bc2342ef903c443bc43ef2eb.Hp0ii26Tf855PoD5"
URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions"

headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {API_KEY}"
}

data = {
    "model": "glm-4.7",
    "messages": [{"role": "user", "content": "帮我查一下当前目录下的文件"}],
    "tools": [{
        "type": "function", 
        "function": {
            "name": "ls", 
            "description": "列出文件",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    }]
}

try:
    response = requests.post(URL, headers=headers, json=data)
    result = response.json()
    
    # 打印原始返回，看看到底有没有 'id'
    message = result['choices'][0]['message']
    print("\n--- 原始返回的消息结构 ---")
    print(json.dumps(message, indent=2, ensure_ascii=False))
    
    if 'tool_calls' in message:
        tool_call = message['tool_calls'][0]
        print("\n--- 关键字段检查 ---")
        print(f"是否存在 'id': {'id' in tool_call}")
        print(f"ID 内容: {tool_call.get('id', '不存在')}")
        
except Exception as e:
    print(f"发生错误: {e}")