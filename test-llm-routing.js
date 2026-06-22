/**
 * LLM Tool-Calling 路由测试
 * 验证开放工具列表后,LLM 能否正确选择对应工具(而不是被关键词降级到 V2 旧链路)
 */
const http = require('http');

const API_BASE = 'http://localhost:3000/api';

function makeJson(method, urlPath, body, headers) {
  return new Promise((resolve, reject) => {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(headers || {}) }
    };
    const req = http.request(`${API_BASE}${urlPath}`, opts, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data || '{}') }); }
        catch { resolve({ status: res.statusCode, body: { raw: data } }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function sse(method, urlPath, body, headers) {
  return new Promise((resolve) => {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', ...(headers || {}) }
    };
    const events = [];
    const req = http.request(`${API_BASE}${urlPath}`, opts, (res) => {
      let buf = '';
      res.on('data', (c) => {
        buf += c.toString('utf-8');
        const parts = buf.split('\n\n');
        buf = parts.pop() || '';
        for (const p of parts) {
          if (!p.trim()) continue;
          const lines = p.split('\n');
          const dataLine = lines.find((l) => l.startsWith('data: '))?.substring(6) || '';
          try { events.push(JSON.parse(dataLine)); } catch { events.push({ raw: dataLine }); }
        }
      });
      res.on('end', () => resolve({ status: res.statusCode, events }));
    });
    req.on('error', () => resolve({ status: 0, events }));
    if (body) req.write(JSON.stringify(body));
    req.end();
    setTimeout(() => req.destroyed || req.destroy(), 30000);
  });
}

async function setupUser() {
  const ts = String(Date.now()).slice(-8);
  const email = `t${ts}@panghu.dev`;
  const password = 'Test123456!';
  const reg = await makeJson('POST', '/auth/register', { email, password, username: `t${ts}` });
  if (!reg.body?.success) throw new Error('注册失败: ' + JSON.stringify(reg.body));
  const token = reg.body.data.token;
  const cat = await makeJson('POST', '/my-cats',
    { name: '测试猫', breed: '田园猫', gender: 'male', birthDate: '2024-01-01' },
    { Authorization: `Bearer ${token}` }
  );
  if (!cat.body?.success) throw new Error('创建猫失败');
  return { token, catId: cat.body.data.id, userId: reg.body.data.user?.id || reg.body.data.userId };
}

async function testIntent(token, catId, message, expectedTool) {
  const r = await sse('POST', '/chat/messages',
    { conversationId: null, content: message, catId, useAgent: true },
    { Authorization: `Bearer ${token}` }
  );
  const toolEvents = r.events.filter((e) => e.type === 'tool');
  const pendingConf = r.events.find((e) => e.type === 'pending_confirmation');
  const contentText = r.events.filter((e) => e.type === 'content').map((e) => e.text || '').join('');

  const calledTools = toolEvents.map((e) => e.toolName);
  const writeTool = pendingConf?.toolName;

  const isExpectedHit = writeTool === expectedTool || calledTools.includes(expectedTool);

  console.log(`\n📝 [${message}]`);
  console.log(`   期望工具:${expectedTool}`);
  console.log(`   实际工具:${writeTool ? '[write]' + writeTool : calledTools.length ? calledTools.join(',') : '(无工具)'}`);
  console.log(`   AI回复:${contentText.substring(0, 80)}${contentText.length > 80 ? '...' : ''}`);
  console.log(`   结果:${isExpectedHit ? '✅ 通过' : '❌ 失败'}`);
  return isExpectedHit;
}

async function main() {
  const { token, catId } = await setupUser();
  console.log('✅ 用户准备就绪 catId=' + catId);

  const cases = [
    // 写入意图
    { msg: '记一下今天体重 4.2 公斤', tool: 'ADD_weight_record' },
    { msg: '我家猫今天 8 斤', tool: 'ADD_weight_record' },
    { msg: '帮我登记一下今天打了妙三多疫苗', tool: 'ADD_vaccine_record' },
    { msg: '记录一下刚做的体外驱虫', tool: 'ADD_vaccine_record' },
    { msg: '给猫记一笔今天发生的事:它今天特别活泼', tool: 'ADD_growth_record' },

    // 查询意图
    { msg: '看看最近的成长记录', tool: 'get_growth_records' },
    { msg: '我家猫多大了', tool: 'get_cat_info' },
    { msg: '下次该打什么疫苗', tool: 'check_vaccine' },

    // 自然语言难案例(原来规则系统会误判的)
    { msg: '我家猫最近精神不太好，是不是病了', tool: 'check_health' },
  ];

  const results = [];
  for (const c of cases) {
    const pass = await testIntent(token, catId, c.msg, c.tool);
    results.push({ ...c, pass });
    await new Promise((r) => setTimeout(r, 1500)); // 加大间隔规避限流
  }

  const passCount = results.filter((r) => r.pass).length;
  console.log(`\n📊 总结: ${passCount}/${results.length} 通过`);
  console.log(results.map((r) => `${r.pass ? '✅' : '❌'} [${r.tool}] ${r.msg}`).join('\n'));
  process.exit(passCount === results.length ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
