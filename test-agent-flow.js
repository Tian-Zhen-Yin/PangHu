/**
 * Agent 功能集成测试脚本
 * 测试：注册用户 → 登录 → 创建猫 → 上传图片 → 发送带附件的消息 → 接收 pending_confirmation → 确认 → 检查消息中的成功反馈
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:3000/api';

function makeRequest(method, urlPath, body, headers) {
  return new Promise((resolve, reject) => {
    const opts = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(headers || {})
      }
    };
    const req = http.request(`${API_BASE}${urlPath}`, opts, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data || '{}') });
        } catch (err) {
          resolve({ status: res.statusCode, headers: res.headers, body: { raw: data } });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

function makeSSERequest(method, urlPath, body, headers) {
  return new Promise((resolve, reject) => {
    const opts = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        ...(headers || {})
      }
    };
    const events = [];
    const req = http.request(`${API_BASE}${urlPath}`, opts, (res) => {
      let buffer = '';
      res.on('data', (chunk) => {
        buffer += chunk.toString('utf-8');
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';
        for (const part of parts) {
          if (!part.trim()) continue;
          const lines = part.split('\n');
          const eventName = lines.find((l) => l.startsWith('event: '))?.substring(7) || 'message';
          const dataLine = lines.find((l) => l.startsWith('data: '))?.substring(6) || '';
          try {
            events.push({ event: eventName, data: dataLine ? JSON.parse(dataLine) : { raw: dataLine } });
          } catch {
            events.push({ event: eventName, data: { raw: dataLine } });
          }
        }
      });
      res.on('end', () => resolve({ status: res.statusCode, events }));
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();

    // 超时 30s
    setTimeout(() => {
      if (!req.destroyed) {
        req.destroy();
        resolve({ status: 0, events, error: 'timeout' });
      }
    }, 30000);
  });
}

function uploadImage(token, imagePath) {
  return new Promise((resolve, reject) => {
    const boundary = '----formboundary' + Date.now();
    const fileBuffer = fs.readFileSync(imagePath);
    const filename = 'test-image.png';
    const pre = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="photos"; filename="${filename}"\r\nContent-Type: image/png\r\n\r\n`
    );
    const post = Buffer.from(`\r\n--${boundary}--\r\n`);
    const body = Buffer.concat([pre, fileBuffer, post]);
    const opts = {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Authorization': `Bearer ${token}`
      }
    };
    const req = http.request(`${API_BASE}/chat/upload`, opts, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: { raw: data } });
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const timestamp = Date.now();
  const shortTs = String(timestamp).slice(-8);
  const email = `t${shortTs}@panghu.dev`;
  const password = 'Test123456!';
  const results = {};

  // 1. 注册
  console.log('\n=== 1. 注册用户 ===');
  const regRes = await makeRequest('POST', '/auth/register', { email, password, username: `t${shortTs}` });
  console.log('Register:', regRes.status, regRes.body);
  if (!regRes.body?.success) throw new Error('注册失败');
  const token = regRes.body.data.token;

  // 2. 登录
  console.log('\n=== 2. 登录 ===');
  const loginRes = await makeRequest('POST', '/auth/login', { account: email, password });
  console.log('Login:', loginRes.status, loginRes.body);
  if (!loginRes.body?.success) throw new Error('登录失败');

  // 3. 创建猫咪
  console.log('\n=== 3. 创建猫咪 ===');
  const catRes = await makeRequest(
    'POST',
    '/my-cats',
    { name: `测试猫`, breed: '田园猫', gender: 'male', birthDate: '2024-01-01' },
    { Authorization: `Bearer ${token}` }
  );
  console.log('CreateCat:', catRes.status, catRes.body);
  if (!catRes.body?.success) throw new Error('创建猫失败');
  const catId = catRes.body.data.id;

  // 4. 上传图片
  console.log('\n=== 4. 上传图片 ===');
  // 构造一个简单的小图片（PNG 最小 68 字节，这里我们用 multer 要求的文件）
  const tmpImgPath = path.join(__dirname, 'tmp-test-img.png');
  fs.writeFileSync(
    tmpImgPath,
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      'base64'
    )
  );
  const uploadRes = await uploadImage(token, tmpImgPath);
  console.log('Upload:', uploadRes.status, uploadRes.body);
  if (!uploadRes.body?.success || !uploadRes.body.data?.urls || uploadRes.body.data.urls.length === 0) {
    throw new Error('图片上传失败');
  }
  const imageUrl = uploadRes.body.data.urls[0];
  results.imageUrl = imageUrl;

  // 5. 发送带图片附件的消息 - Agent 流式响应
  console.log('\n=== 5. 发送带附件的消息（SSE）===');
  const sseRes = await makeSSERequest('POST', '/chat/messages', {
    conversationId: null,
    content: '今天猫咪很开心，看一下这张照片，记录一下成长',
    catId,
    attachments: [imageUrl],
    useAgent: true
  }, { Authorization: `Bearer ${token}` });
  console.log('SSE status:', sseRes.status);
  console.log('SSE events count:', sseRes.events?.length);

  const pendingConfirmationEvent = sseRes.events?.find((e) => e.data?.type === 'pending_confirmation' || e.data?.confirmationId);
  const doneEvent = sseRes.events?.find((e) => e.data?.type === 'done');
  const contentEvents = sseRes.events?.filter((e) => e.data?.type === 'content' || e.data?.text);
  const toolEvents = sseRes.events?.filter((e) => e.data?.type === 'tool');
  const metaEvents = sseRes.events?.filter((e) => e.data?.type === 'meta');

  console.log('\nMeta events:', metaEvents?.length);
  console.log('Tool events:', toolEvents?.length, toolEvents?.map((e) => e.data.toolName));
  console.log('Content events:', contentEvents?.length, contentEvents?.map((e) => (e.data.text || '').substring(0, 50)));
  console.log('Pending confirmation:', !!pendingConfirmationEvent, pendingConfirmationEvent?.data);
  console.log('Done:', !!doneEvent, doneEvent?.data ? 'yes' : 'no');
  results.pendingConfirmation = !!pendingConfirmationEvent;
  results.toolEventsCount = toolEvents?.length || 0;
  results.contentEventsCount = contentEvents?.length || 0;

  // 6. 如有 pendingConfirmation，执行确认
  if (pendingConfirmationEvent) {
    const { confirmationId } = pendingConfirmationEvent.data;
    console.log('\n=== 6. 确认写入 ===');
    const confirmRes = await makeRequest(
      'POST',
      '/chat/confirm',
      { confirmationId, action: 'confirm', edits: { notes: '今天猫咪很开心的记录', photos: [imageUrl], type: 'daily' } },
      { Authorization: `Bearer ${token}` }
    );
    console.log('Confirm:', confirmRes.status, JSON.stringify(confirmRes.body, null, 2).substring(0, 500));
    results.confirmSuccess = confirmRes.body?.success && confirmRes.body?.data?.success !== false;
    results.recordSaved = confirmRes.body?.data?.recordId || confirmRes.body?.data?.record?.id;
  }

  // 7. 获取对话消息，检查是否已写入
  console.log('\n=== 7. 验证对话中写入后的消息是否保留 ===');
  const convs = await makeRequest('GET', '/chat/conversations', null, { Authorization: `Bearer ${token}` });
  console.log('Conversations:', convs.status, convs.body?.data?.length || 0);
  const convId = convs.body?.data?.[0]?.id;
  results.conversationsFound = !!convId;

  // 8. 测试意图：仅文本（记录体重）
  console.log('\n=== 8. 纯文本意图 - 记录体重 ===');
  const textOnlySSE = await makeSSERequest(
    'POST',
    '/chat/messages',
    { conversationId: convId || null, content: '记一下今天体重 4.2 公斤', catId, useAgent: true },
    { Authorization: `Bearer ${token}` }
  );
  const textPending = textOnlySSE.events?.find(
    (e) => e.data?.type === 'pending_confirmation' || e.data?.confirmationId
  );
  console.log('Text only pendingConfirmation:', !!textPending, textPending?.data?.toolName);
  results.textWeightRecordDetected = !!textPending;

  // 9. 测试意图：疫苗
  console.log('\n=== 9. 疫苗记录意图 ===');
  const vaccineSSE = await makeSSERequest(
    'POST',
    '/chat/messages',
    { conversationId: convId || null, content: '记录一下刚打了妙三多疫苗', catId, useAgent: true },
    { Authorization: `Bearer ${token}` }
  );
  const vaccinePending = vaccineSSE.events?.find(
    (e) => e.data?.type === 'pending_confirmation' || e.data?.confirmationId
  );
  console.log('Vaccine pending:', !!vaccinePending, vaccinePending?.data?.toolName);
  results.vaccineRecordDetected = !!vaccinePending;

  // 清理
  try { fs.unlinkSync(tmpImgPath); } catch {}

  console.log('\n========================');
  console.log('测试结果汇总:');
  console.log(JSON.stringify(results, null, 2));

  // 判断是否全部通过
  const allPass =
    results.pendingConfirmation === true &&
    results.confirmSuccess === true &&
    results.textWeightRecordDetected === true &&
    results.vaccineRecordDetected === true;

  console.log('\n总评:', allPass ? '✅ 全部通过' : '❌ 部分失败');
  process.exit(allPass ? 0 : 1);
}

main().catch((err) => {
  console.error('测试失败:', err);
  process.exit(1);
});
