#!/usr/bin/env python3

import os
import json
import time
import uuid
import zipfile
import requests
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

from fastapi import FastAPI, Form
from fastapi.responses import HTMLResponse, FileResponse
import uvicorn

# ================= 基础配置 =================

API_URL = "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation"
MODEL = "qwen-image-max"
MAX_RETRY = 3

BASE_STRUCTURE = """
一只可爱的猫咪吉祥物扁平插画。
极简矢量风格，干净线条，柔和阴影，图标风格。
角色在所有图片中保持完全一致。
"""

NEGATIVE_PROMPT = "写实风格，摄影，3D渲染，暗色主题，复杂细节，过度写实毛发。"

# ================= 品种配置 =================

BREEDS = {
    "American Shorthair": "银虎斑，圆脸，短腿，绿色眼睛",
    "Ragdoll": "蓝色眼睛，白灰长毛，温柔气质",
    "Siamese": "蓝眼睛，深色脸部，修长体型",
    "British Shorthair": "圆脸，厚毛，敦实身材，铜色眼睛"
}

# ================= 风格配置 =================

STYLES = {
    "flat": "极简扁平矢量风格，奶油色背景",
    "sticker": "贴纸风格，白色描边，透明背景",
    "corporate": "企业吉祥物风格，清爽蓝色系"
}

# ================= 目录 =================

BASE_DIR = Path(".")
CHARACTER_DIR = BASE_DIR / "characters"
GENERATED_DIR = BASE_DIR / "generated"
ZIP_DIR = BASE_DIR / "zips"

for d in [CHARACTER_DIR, GENERATED_DIR, ZIP_DIR]:
    d.mkdir(exist_ok=True)

# ================= FastAPI =================

app = FastAPI()

# ================= 工具函数 =================

def get_api_key():
    key = os.getenv("DASHSCOPE_API_KEY")
    if not key:
        raise ValueError("请设置环境变量 DASHSCOPE_API_KEY")
    return key


def build_prompt(character_info, expression):
    return f"""
{BASE_STRUCTURE}
品种特征：{character_info['breed_desc']}
风格特征：{character_info['style_desc']}
角色ID：{character_info['id']}，保持外观完全一致。
表情动作：{expression}
"""


def generate_image(prompt, output_path, size="1024*1024", retry=MAX_RETRY):
    headers = {
        "Authorization": f"Bearer {get_api_key()}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": MODEL,
        "input": {
            "messages": [
                {"role": "user", "content": [{"text": prompt}]}
            ]
        },
        "parameters": {
            "negative_prompt": NEGATIVE_PROMPT,
            "size": size,
            "watermark": False
        }
    }

    try:
        response = requests.post(API_URL, headers=headers, json=payload, timeout=120)

        if response.status_code == 200:
            result = response.json()
            image_url = result["output"]["choices"][0]["message"]["content"][0]["image"]
            img = requests.get(image_url)
            if img.status_code == 200:
                with open(output_path, "wb") as f:
                    f.write(img.content)
                return True

        if response.status_code == 429 and retry > 0:
            time.sleep(3)
            return generate_image(prompt, output_path, size, retry - 1)

        return False

    except Exception:
        return False


def create_zip(folder_path, zip_name):
    zip_path = ZIP_DIR / zip_name
    with zipfile.ZipFile(zip_path, "w") as zipf:
        for file in folder_path.glob("*.png"):
            zipf.write(file, file.name)
    return zip_path


# ================= 页面 =================

@app.get("/", response_class=HTMLResponse)
def home():
    breed_options = "".join([f'<option value="{b}">{b}</option>' for b in BREEDS])
    style_options = "".join([f'<option value="{s}">{s}</option>' for s in STYLES])

    return f"""
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>🐱 猫咪吉祥物 IP 工厂</title>
        <style>
            * {{
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }}
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 20px;
            }}
            .container {{
                background: white;
                border-radius: 20px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                padding: 40px;
                max-width: 600px;
                width: 100%;
            }}
            h2 {{
                text-align: center;
                color: #333;
                margin-bottom: 8px;
                font-size: 28px;
            }}
            .subtitle {{
                text-align: center;
                color: #888;
                margin-bottom: 30px;
                font-size: 14px;
            }}
            .form-group {{
                margin-bottom: 24px;
            }}
            label {{
                display: block;
                margin-bottom: 8px;
                color: #555;
                font-weight: 600;
                font-size: 14px;
            }}
            select, textarea {{
                width: 100%;
                padding: 12px 16px;
                border: 2px solid #e0e0e0;
                border-radius: 12px;
                font-size: 15px;
                transition: all 0.3s ease;
                background: #fafafa;
            }}
            select:focus, textarea:focus {{
                outline: none;
                border-color: #667eea;
                background: white;
            }}
            select {{
                cursor: pointer;
                appearance: none;
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23667eea' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
                background-repeat: no-repeat;
                background-position: right 16px center;
                padding-right: 40px;
            }}
            textarea {{
                resize: vertical;
                min-height: 140px;
                font-family: inherit;
                line-height: 1.6;
            }}
            .tag-hint {{
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
                margin-top: 10px;
            }}
            .tag {{
                background: #f0f0f0;
                color: #666;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s;
            }}
            .tag:hover {{
                background: #667eea;
                color: white;
            }}
            button {{
                width: 100%;
                padding: 16px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 12px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            }}
            button:hover {{
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
            }}
            button:active {{
                transform: translateY(0);
            }}
            .icon {{
                font-size: 48px;
                text-align: center;
                margin-bottom: 10px;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="icon">🐱</div>
            <h2>猫咪吉祥物 IP 工厂</h2>
            <p class="subtitle">AI 驱动的品牌吉祥物生成器</p>
            <form method="post" action="/generate">
                <div class="form-group">
                    <label for="breed">🐾 选择品种</label>
                    <select name="breed" id="breed">{breed_options}</select>
                </div>

                <div class="form-group">
                    <label for="style">🎨 选择风格</label>
                    <select name="style" id="style">{style_options}</select>
                </div>

                <div class="form-group">
                    <label for="expressions">😊 表情动作（每行一个）</label>
                    <textarea name="expressions" id="expressions" placeholder="输入想要的表情或动作...">微笑
疑惑
点头
拿咖啡
认真看数据</textarea>
                    <div class="tag-hint">
                        <span class="tag" onclick="addTag('开心')">开心</span>
                        <span class="tag" onclick="addTag('惊讶')">惊讶</span>
                        <span class="tag" onclick="addTag('思考')">思考</span>
                        <span class="tag" onclick="addTag('点赞')">点赞</span>
                        <span class="tag" onclick="addTag('打哈欠')">打哈欠</span>
                    </div>
                </div>

                <button type="submit">✨ 生成套图</button>
            </form>
        </div>
        <script>
            function addTag(text) {{
                const textarea = document.getElementById('expressions');
                if (textarea.value && !textarea.value.endsWith('\n')) {{
                    textarea.value += '\n';
                }}
                textarea.value += text + '\n';
                textarea.focus();
            }}
        </script>
    </body>
    </html>
    """


@app.post("/generate", response_class=HTMLResponse)
def generate(breed: str = Form(...),
             style: str = Form(...),
             expressions: str = Form(...)):

    character_id = str(uuid.uuid4())[:8]

    character_info = {
        "id": character_id,
        "breed_desc": BREEDS[breed],
        "style_desc": STYLES[style]
    }

    # 保存角色信息
    with open(CHARACTER_DIR / f"{character_id}.json", "w") as f:
        json.dump(character_info, f, ensure_ascii=False, indent=2)

    lines = [e.strip() for e in expressions.split("\n") if e.strip()]

    char_folder = GENERATED_DIR / character_id
    char_folder.mkdir(exist_ok=True)

    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = []
        for i, exp in enumerate(lines):
            prompt = build_prompt(character_info, exp)
            output_path = char_folder / f"{i+1}_{exp}.png"
            futures.append(executor.submit(generate_image, prompt, output_path))

        for f in as_completed(futures):
            f.result()

    zip_path = create_zip(char_folder, f"{character_id}.zip")

    return f"""
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>生成完成 - 猫咪吉祥物 IP 工厂</title>
        <style>
            * {{
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }}
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 20px;
            }}
            .container {{
                background: white;
                border-radius: 20px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                padding: 50px;
                max-width: 500px;
                width: 100%;
                text-align: center;
            }}
            .success-icon {{
                width: 80px;
                height: 80px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 24px;
                font-size: 40px;
                color: white;
            }}
            h3 {{
                color: #333;
                font-size: 24px;
                margin-bottom: 16px;
            }}
            .character-id {{
                background: #f5f5f5;
                padding: 12px 20px;
                border-radius: 10px;
                display: inline-block;
                margin-bottom: 30px;
                font-family: monospace;
                font-size: 18px;
                color: #667eea;
                letter-spacing: 2px;
            }}
            .btn {{
                display: block;
                width: 100%;
                padding: 16px;
                border-radius: 12px;
                font-size: 16px;
                font-weight: 600;
                text-decoration: none;
                margin-bottom: 12px;
                transition: all 0.3s ease;
            }}
            .btn-primary {{
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            }}
            .btn-primary:hover {{
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
            }}
            .btn-secondary {{
                background: #f0f0f0;
                color: #666;
            }}
            .btn-secondary:hover {{
                background: #e0e0e0;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="success-icon">🎉</div>
            <h3>生成完成！</h3>
            <div class="character-id">ID: {character_id}</div>
            <a href="/download/{zip_path.name}" class="btn btn-primary">📦 下载 ZIP 包</a>
            <a href="/" class="btn btn-secondary">← 返回首页</a>
        </div>
    </body>
    </html>
    """


@app.get("/download/{filename}")
def download(filename: str):
    return FileResponse(ZIP_DIR / filename, filename=filename)


# ================= 启动 =================

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)