# API 文档

> **版本:** V4.0
> **更新时间:** 2026-06-04
> **基础 URL:** `http://localhost:3000/api`

本文档提供哈吉咪养成计划项目的完整 API 接口文档。

---

## 📋 目录

- [认证机制](#认证机制)
- [通用响应格式](#通用响应格式)
- [认证接口](#认证接口)
- [猫咪管理](#猫咪管理)
- [成长记录](#成长记录)
- [体重分析](#体重分析)
- [AI 顾问](#ai-顾问)
- [错误码](#错误码)

---

## 🔐 认证机制

### JWT 认证

所有需要认证的接口都需要在请求头中携带 JWT Token：

```http
Authorization: Bearer <token>
```

### 获取 Token

通过登录或注册接口获取：

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

响应：

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "username": "测试用户"
    }
  }
}
```

---

## 📡 通用响应格式

### 成功响应

```json
{
  "success": true,
  "message": "操作成功",
  "data": { /* 响应数据 */ }
}
```

### 错误响应

```json
{
  "success": false,
  "message": "错误描述",
  "code": "ERROR_CODE"
}
```

---

## 👤 认证接口

### 用户注册

```http
POST /api/auth/register
Content-Type: application/json
```

**请求体：**

```json
{
  "email": "user@example.com",
  "password": "password123",
  "username": "测试用户"
}
```

**响应：**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "username": "测试用户"
    }
  },
  "message": "注册成功"
}
```

### 用户登录

```http
POST /api/auth/login
Content-Type: application/json
```

**请求体：**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### 获取当前用户

```http
GET /api/auth/me
Authorization: Bearer <token>
```

---

## 🐱 猫咪管理

### 获取猫咪列表

```http
GET /api/my-cats
Authorization: Bearer <token>
```

**响应：**

```json
{
  "success": true,
  "data": [
    {
      "id": "cat_123",
      "name": "奶糖",
      "breed": "英国短毛猫",
      "gender": "female",
      "birthDate": "2023-01-15",
      "weight": 1.2,
      "avatar": "https://example.com/avatar.jpg",
      "ageFormatted": "1岁2个月"
    }
  ]
}
```

### 获取猫咪详情

```http
GET /api/my-cats/:catId
Authorization: Bearer <token>
```

**路径参数：**

- `catId`: 猫咪ID

### 创建猫咪

```http
POST /api/my-cats
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体：**

```json
{
  "name": "奶糖",
  "breed": "英国短毛猫",
  "gender": "female",
  "birthDate": "2023-01-15",
  "weight": 1.2
}
```

### 更新猫咪

```http
PUT /api/my-cats/:catId
Authorization: Bearer <token>
Content-Type: application/json
```

### 删除猫咪

```http
DELETE /api/my-cats/:catId
Authorization: Bearer <token>
```

---

## 📝 成长记录

### 获取猫咪成长记录

```http
GET /api/my-cats/:catId/records
Authorization: Bearer <token>
```

**查询参数：**

- `page`: 页码（默认1）
- `limit`: 每页数量（默认20）

**响应：**

```json
{
  "success": true,
  "data": {
    "records": [
      {
        "id": "record_123",
        "recordDate": "2023-06-15",
        "weight": 1.5,
        "notes": "健康成长中",
        "photoUrl": "https://example.com/photo.jpg"
      }
    ],
    "total": 50,
    "page": 1,
    "limit": 20
  }
}
```

### 创建成长记录

```http
POST /api/my-cats/:catId/records
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体：**

```json
{
  "recordDate": "2023-06-15",
  "weight": 1.5,
  "notes": "健康成长中",
  "photoUrl": "https://example.com/photo.jpg"
}
```

---

## 📊 体重分析

### 获取体重历史

```http
GET /api/my-cats/:catId/weight-history
Authorization: Bearer <token>
```

**响应：**

```json
{
  "success": true,
  "data": [
    {
      "date": "2023-06-15",
      "weight": 1.5,
      "notes": "体重1.5kg，健康成长中"
    }
  ]
}
```

### 获取体重分析

```http
GET /api/weight-standards/:catId/analysis
Authorization: Bearer <token>
```

**响应：**

```json
{
  "success": true,
  "data": {
    "status": "normal",
    "message": "体重正常，继续保持当前喂养方式",
    "current": 4.2,
    "min": 3.5,
    "max": 5.5,
    "percentage": 47,
    "deviation": -0.3
  }
}
```

---

## 🤖 AI 顾问

### AI 问答

```http
POST /api/chat/messages
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体：**

```json
{
  "message": "幼猫需要打什么疫苗？",
  "catId": "cat_123"
}
```

**响应（流式）：**

```
event: message_start
data: {"model": "glm-4-flash"}

event: message_delta
data: {"content": "幼猫需要"}

event: message_delta
data: {"content": "接种的核心"}

event: message_delta
data: {"content": "疫苗包括："}

event: message_done
data: {"citations": [...]}
```

---

## ❌ 错误码

| 状态码 | 错误码 | 说明 |
|--------|--------|------|
| 400 | INVALID_INPUT | 输入数据验证失败 |
| 401 | UNAUTHORIZED | 未授权或 Token 无效 |
| 403 | FORBIDDEN | 无权访问该资源 |
| 404 | NOT_FOUND | 资源不存在 |
| 409 | CONFLICT | 资源冲突（如邮箱已存在） |
| 500 | INTERNAL_ERROR | 服务器内部错误 |

### 错误响应示例

```json
{
  "success": false,
  "message": "未授权",
  "code": "UNAUTHORIZED"
}
```

---

## 🔄 API 版本管理

当前版本：**v4.0**

版本历史：

- **v4.0** (2026-06-04) - 文档重构，新增批量API
- **v3.2** (2026-02-26) - 多猫对比功能
- **v3.1** (2026-02-25) - 体重健康标准
- **v3.0** (2026-02-24) - 体重趋势图表

---

## 🧪 测试 API

### 使用 curl

```bash
# 登录
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# 获取猫咪列表
curl http://localhost:3000/api/my-cats \
  -H "Authorization: Bearer <token>"
```

### 使用 Postman

1. 导入环境变量
2. 设置 `base_url` = `http://localhost:3000/api`
3. 设置 `token` 变量
4. 导入 API 集合（如提供）

---

## 📞 获取帮助

- 查看 [开发文档](./开发文档.md)
- 查看 [故障排查](./故障排查.md)
- 提交 [Issue](https://github.com/Tian-Zhen-Yin/PangHu/issues)

---

_API 文档最后更新：2026-06-04_
