const fs = require('fs')
const path = require('path')
const BASE = 'http://localhost:3000/api'
let TOKEN = '', CAT_ID = ''
const log = (...a) => console.log(...a)
let failures = 0
const pass = (n) => log(`  ✅ PASS: ${n}`)
const fail = (n, e) => { log(`  ❌ FAIL: ${n} -> ${e}`); failures++ }

async function register() {
  const rnd = Math.floor(Math.random() * 1e8)
  const r = await (await fetch(`${BASE}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: `e2e_${rnd}@test.com`, username: `e2e${rnd}`, password: 'Test1234' }) })).json()
  TOKEN = r.data.token
}
async function createCat() {
  const r = await (await fetch(`${BASE}/my-cats`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` }, body: JSON.stringify({ name: '花花', gender: 'female', birthDate: '2025-01-01', weight: 2.0, breed: '中华田园猫' }) })).json()
  CAT_ID = r.data.id
}
async function sendMessage(content, attachments) {
  const res = await fetch(`${BASE}/chat/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}`, Accept: 'text/event-stream' }, body: JSON.stringify({ content, catId: CAT_ID, attachments }) })
  const events = []
  const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = ''
  while (true) { const { done, value } = await reader.read(); if (done) break; buf += dec.decode(value, { stream: true }); const lines = buf.split('\n'); buf = lines.pop(); for (const l of lines) { const t = l.trim(); if (t.startsWith('data:')) { try { events.push(JSON.parse(t.slice(5).trim())) } catch {} } } }
  return events
}
async function confirm(id, edits) { return (await fetch(`${BASE}/chat/confirm`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` }, body: JSON.stringify({ confirmationId: id, action: 'confirm', edits }) })).json() }
async function uploadImage() {
  const buf = fs.readFileSync(path.join(__dirname, 'test-pixel.png')); const fd = new FormData(); fd.append('photos', new Blob([buf], { type: 'image/png' }), 'test-pixel.png')
  return (await fetch(`${BASE}/chat/upload`, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}` }, body: fd })).json()
}
const findPending = (ev) => ev.find((e) => e.type === 'pending_confirmation')
const contentText = (ev) => ev.filter(e => e.type === 'content').map(e => e.text || '').join('')

async function main() {
  await register(); await createCat(); log('环境就绪 cat=', CAT_ID)

  log('\n=== 用例1: 图片上传 ===')
  let urls = []
  const up = await uploadImage(); urls = up.data?.urls || []
  if (up.success && urls.length === 1 && urls[0].startsWith('/uploads/pets/')) pass('图片上传'); else fail('图片上传', JSON.stringify(up))

  log('\n=== 用例2: 带附件→成长记录确认 (并检查无兜底文案) ===')
  const ev2 = await sendMessage('这个是花花的近照，体重2.2kg，这个月已经做过驱虫了', urls)
  const p2 = findPending(ev2)
  const txt2 = contentText(ev2)
  if (p2 && p2.toolName === 'ADD_growth_record') pass('路由到 ADD_growth_record + 请求确认'); else fail('带附件路由', JSON.stringify(ev2.map(e => e.type)))
  if (txt2.trim().length === 0) pass('确认时无多余兜底文案 (content 为空)'); else fail('兜底文案泄漏', '收到 content: ' + txt2.slice(0, 50))

  log('\n=== 用例3: 确认写入成长记录 ===')
  if (p2) { const r = await confirm(p2.confirmationId, { notes: '花花的近照，已驱虫', photos: urls }); if (r.success && r.data?.success && r.data?.recordId) pass('写入成功 ' + r.data.recordId); else fail('写入', JSON.stringify(r)) } else fail('写入', '无pending')

  log('\n=== 用例4a: 体重录入 (检查无兜底) ===')
  const ev4 = await sendMessage('记录体重 4.2kg', [])
  const p4 = findPending(ev4)
  if (p4 && p4.toolName === 'ADD_weight_record' && contentText(ev4).trim().length === 0) { const r = await confirm(p4.confirmationId, { weight: 4.2 }); if (r.success && r.data?.success) pass('体重录入+写入'); else fail('体重写入', JSON.stringify(r)) } else fail('体重录入', 'events=' + JSON.stringify(ev4.map(e => e.type)) + ' content=' + contentText(ev4).slice(0,30))

  log('\n=== 用例4b: 疫苗录入 (检查无兜底) ===')
  const ev5 = await sendMessage('记录疫苗 打了妙三多', [])
  const p5 = findPending(ev5)
  if (p5 && p5.toolName === 'ADD_vaccine_record' && contentText(ev5).trim().length === 0) { const r = await confirm(p5.confirmationId, { vaccineName: '妙三多' }); if (r.success && r.data?.success) pass('疫苗录入+写入'); else fail('疫苗写入', JSON.stringify(r)) } else fail('疫苗录入', 'events=' + JSON.stringify(ev5.map(e => e.type)) + ' content=' + contentText(ev5).slice(0,30))

  log('\n=== 用例5: 查询成长记录 ===')
  const ev6 = await sendMessage('看看花花的成长记录', [])
  const t6 = ev6.find((e) => e.type === 'tool' && e.toolName === 'get_growth_records')
  if (t6 && t6.output?.success && t6.output.total >= 1) pass('查询返回 ' + t6.output.total + ' 条'); else fail('查询', JSON.stringify(ev6.map(e => e.type + (e.toolName ? ':' + e.toolName : ''))))

  log('\n' + (failures === 0 ? '🎉 全部用例通过' : `⚠️ ${failures} 个失败`))
  process.exit(failures === 0 ? 0 : 1)
}
main().catch((e) => { console.error(e); process.exit(1) })
