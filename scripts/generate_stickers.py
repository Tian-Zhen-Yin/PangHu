#!/usr/bin/env python3
"""
胖虎表情包自动生成脚本
使用通义万相 qwen-image-max 模型批量生成 8 个表情图片
"""

import os
import time
import requests
from pathlib import Path

# ==================== 配置 ====================
API_KEY = "sk-5c8f819d838b4eb8b2eb5843546d2700"
OUTPUT_DIR = Path(__file__).parent / "generated_images"

# qwen-image-max 使用 multimodal-generation 端点
API_URL = "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation"
MODEL = "qwen-image-max"

# ==================== 表情 Prompt 定义 ====================

# 基础角色锁定 Prompt（中文版）
BASE_PROMPT = """一只美短银虎斑猫的扁平插画吉祥物，名叫胖虎。
风格可爱、柔软、圆润造型、极简矢量插画。
银灰色毛发带有淡灰色虎斑纹路，白色下巴和肚皮，柔和的绿色眼睛，短腿、微胖身材、圆脸。
干净的线条，极简阴影，温暖舒适的感觉，简单奶油色背景。
不要写实毛发，不要摄影，不要3D渲染，不要暗色主题，不要锐利线条。"""

# 表情指令
EXPRESSIONS = {
    "01_微笑陪伴": "表情：温柔的小微笑，眼睛微微弯曲，安静地坐着。",
    "02_困困模式": "表情：困困的，眼睛半闭，小小的哈欠，身体放松。",
    "03_被摸舒服": "表情：开心地闭着眼睛，头微微仰起，脸部柔和放松。",
    "04_有点疑惑": "表情：有点困惑，头微微歪着，眼睛看向旁边。",
    "05_小开心": "表情：温柔开心的微笑，眼睛微微发亮，尾巴轻轻翘起。",
    "06_打哈欠": "表情：小小的哈欠，眼睛闭着，嘴巴微微张开但不夸张。",
    "07_等你记录": "表情：安静等待，温柔地向前看，身体端正坐着。",
    "08_认真看数据": "表情：专注但温柔，眼睛微微向下看，旁边有一张小卡片。",
}

# 防止写实的增强句
STYLE_ENHANCEMENT = "极简卡通风格，图标风格，扁平贴纸风格。"

# 负面提示词
NEGATIVE_PROMPT = "低分辨率，低画质，写实风格，摄影，3D渲染，暗色主题，锐利线条，复杂细节，过度饱和，AI感，画面模糊。"


def generate_image(prompt: str, output_path: Path) -> bool:
    """
    调用 qwen-image-max API 生成图片

    Args:
        prompt: 图片描述
        output_path: 输出路径

    Returns:
        是否成功
    """
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": MODEL,
        "input": {
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "text": prompt
                        }
                    ]
                }
            ]
        },
        "parameters": {
            "negative_prompt": NEGATIVE_PROMPT,
            "prompt_extend": True,
            "watermark": False,
            "size": "1024*1024"
        }
    }

    print(f"  📤 提交生成请求...")

    try:
        response = requests.post(API_URL, headers=headers, json=payload, timeout=120)

        if response.status_code == 200:
            result = response.json()

            # qwen-image-max 返回格式: output.choices[0].message.content[0].image
            output = result.get("output", {})
            choices = output.get("choices", [])
            if choices:
                content = choices[0].get("message", {}).get("content", [])
                if content and content[0].get("image"):
                    image_url = content[0]["image"]
                    print(f"  📥 下载图片...")
                    return download_image(image_url, output_path)

            print(f"  ❌ 未找到图片URL")
            return False

        elif response.status_code == 400:
            error = response.json()
            print(f"  ❌ 请求参数错误: {error}")
            return False
        elif response.status_code == 401:
            print(f"  ❌ API Key 无效或已过期")
            return False
        elif response.status_code == 429:
            print(f"  ⚠️ 请求过于频繁，等待 10 秒后重试...")
            time.sleep(10)
            return generate_image(prompt, output_path)
        else:
            print(f"  ❌ 请求失败: {response.status_code} - {response.text}")
            return False

    except requests.exceptions.Timeout:
        print(f"  ❌ 请求超时")
        return False
    except Exception as e:
        print(f"  ❌ 发生错误: {e}")
        return False


def download_image(url: str, output_path: Path) -> bool:
    """下载图片到本地"""
    try:
        response = requests.get(url, timeout=30)
        if response.status_code == 200:
            output_path.parent.mkdir(parents=True, exist_ok=True)
            with open(output_path, "wb") as f:
                f.write(response.content)
            print(f"  ✅ 已保存: {output_path}")
            return True
        else:
            print(f"  ❌ 下载失败: {response.status_code}")
            return False
    except Exception as e:
        print(f"  ❌ 下载出错: {e}")
        return False


def main():
    """主函数"""
    print("=" * 50)
    print(f"🐱 胖虎表情包生成器 ({MODEL})")
    print("=" * 50)
    print()

    # 创建输出目录
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"📁 输出目录: {OUTPUT_DIR.absolute()}")
    print()

    success_count = 0
    fail_count = 0

    for name, expression in EXPRESSIONS.items():
        print(f"\n🎨 生成 [{name}]")

        # 组合完整 prompt
        full_prompt = f"{BASE_PROMPT}\n{expression}\n{STYLE_ENHANCEMENT}"

        # 输出文件路径
        output_path = OUTPUT_DIR / f"{name}.png"

        # 生成图片
        if generate_image(full_prompt, output_path):
            success_count += 1
        else:
            fail_count += 1

        # 避免请求过快
        if name != list(EXPRESSIONS.keys())[-1]:
            print("  等待 3 秒...")
            time.sleep(3)

    # 打印总结
    print()
    print("=" * 50)
    print(f"🎉 完成! 成功: {success_count}, 失败: {fail_count}")
    print(f"📁 图片保存在: {OUTPUT_DIR.absolute()}")
    print("=" * 50)


if __name__ == "__main__":
    main()