<script setup lang="ts">
/**
 * 陪玩推荐卡片
 * 对应工具：RECOMMEND_play
 *
 * 接收 toolOutput（RecommendResult），在对话流中内联渲染推荐结果，
 * 支持 1-5 星打分与一键记录的反馈逻辑。
 *
 * 三种状态对齐 PRD §4.4.7：
 *   - success && !fallback：正常展示分数 + reasons
 *   - success && fallback：不展示分数，展示中性产品文案
 *   - !success：L2 兜底，展示兽医提示
 */
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useMyCatStore } from '../../../stores/myCat.js'
import { submitPlayFeedback } from '../../../api/play.js'
import { track } from '../../../utils/track.js'
import { CATEGORY_LABEL, type RecommendResult, type Suggestion, type GameCategory } from '../../../types/play.js'
import { getPlayIllustration } from '../../../assets/play/index.js'

const props = defineProps<{
  toolOutput: any
}>()

const myCatStore = useMyCatStore()

// 类别对应的占位 emoji（插图未就位时显示）
const CATEGORY_EMOJI: Record<GameCategory, string> = {
  chase: '🏃',
  hunting: '🎯',
  puzzle: '🧩',
  interaction: '🤝',
  climbing: '🧗',
  solo: '🌿',
}

function illustrationOf(s: Suggestion): string | undefined {
  return getPlayIllustration(s.game.id)
}

const result = computed<RecommendResult | null>(() => {
  const out = props.toolOutput
  if (!out || !Array.isArray(out.suggestions)) return null
  return out as RecommendResult
})

const catId = computed(() => myCatStore.currentCat?.id || '')

// 每条推荐的本地打分/记录状态，按 gameId 索引
interface FeedbackState {
  score: number
  completion: boolean
  submitting: boolean
  submitted: boolean
}
const feedback = ref<Record<string, FeedbackState>>({})

function stateOf(s: Suggestion): FeedbackState {
  if (!feedback.value[s.game.id]) {
    feedback.value[s.game.id] = { score: 0, completion: true, submitting: false, submitted: false }
  }
  return feedback.value[s.game.id]!
}

// 指引展开状态，按 gameId 索引
const expandedGuides = ref<Record<string, boolean>>({})
function toggleGuide(s: Suggestion) {
  expandedGuides.value[s.game.id] = !expandedGuides.value[s.game.id]
}

function setScore(s: Suggestion, v: number) {
  stateOf(s).score = v
}

async function submit(s: Suggestion) {
  const st = stateOf(s)
  if (st.score < 1 || st.submitting) return
  if (!catId.value) {
    ElMessage.warning('请先选择猫咪')
    return
  }
  st.submitting = true
  try {
    const res = await submitPlayFeedback({
      catId: catId.value,
      gameId: s.game.id,
      score: st.score,
      completion: st.completion,
      actualDuration: s.game.durationMin,
    })
    if (!res.success) {
      ElMessage.error(res.message || '提交失败')
      return
    }
    st.submitted = true
    track('feedback_submit', {
      catId: catId.value,
      gameId: s.game.id,
      score: st.score,
      completion: st.completion,
      source: 'chat',
    })
    if (st.completion) {
      track('play_complete', {
        catId: catId.value,
        gameId: s.game.id,
        actualDuration: s.game.durationMin,
      })
    }
  } catch (_e) {
    ElMessage.error('网络异常，请重试')
  } finally {
    st.submitting = false
  }
}
</script>

<template>
  <div v-if="result" class="agent-summary-card play-card">
    <div class="agent-summary-body">
      <!-- L2 兜底：兽医提示 -->
      <template v-if="!result.success">
        <div class="play-header">
          <span class="play-header-icon">🎾</span>
          <div class="agent-summary-title">暂无合适的陪玩游戏</div>
        </div>
        <div class="agent-summary-text">{{ result.message || '当前健康状况下暂不建议自行陪玩，建议咨询兽医获取个性化方案。' }}</div>
      </template>

      <!-- 正常 / fallback -->
      <template v-else>
        <div class="play-header">
          <span class="play-header-icon">🎾</span>
          <div class="agent-summary-title">
            {{ result.fallback ? '为你精选了几款游戏' : `为你推荐 ${result.suggestions.length} 款陪玩游戏` }}
          </div>
        </div>

        <ul class="play-list">
          <li v-for="s in result.suggestions" :key="s.game.id" class="play-item" :class="{ expanded: expandedGuides[s.game.id] }">
            <div class="play-item-head">
              <div class="play-thumb" :class="{ 'is-placeholder': !illustrationOf(s) }">
                <img v-if="illustrationOf(s)" :src="illustrationOf(s)" :alt="s.game.name" />
                <span v-else>{{ CATEGORY_EMOJI[s.game.category] }}</span>
              </div>
              <div class="play-item-info">
                <span class="play-item-name">{{ s.game.name }}</span>
                <div class="play-item-meta">
                  <span class="tag">{{ CATEGORY_LABEL[s.game.category] }}</span>
                  <span>{{ s.game.durationMin }} 分钟</span>
                  <span>强度 {{ '●'.repeat(s.game.energyCost) }}{{ '○'.repeat(5 - s.game.energyCost) }}</span>
                </div>
              </div>
              <div v-if="!result.fallback" class="play-item-score">
                <span class="score-num">{{ s.score }}</span>
                <span class="score-unit">分</span>
              </div>
            </div>

            <ul class="play-reasons">
              <li v-for="r in s.reasons" :key="r">{{ r }}</li>
            </ul>

            <!-- 查看指引 -->
            <template v-if="s.game.guide">
              <button type="button" class="guide-toggle" @click="toggleGuide(s)">
                {{ expandedGuides[s.game.id] ? '收起指引 ▲' : '查看陪玩指引 ▼' }}
              </button>
              <div v-if="expandedGuides[s.game.id]" class="guide-body">
                <div class="guide-goal">🎯 {{ s.game.guide.goal }}</div>
                <ol class="guide-steps">
                  <li v-for="(step, i) in s.game.guide.steps" :key="i">
                    <span class="step-title">{{ step.title }}</span>
                    <span v-if="step.durationSec" class="step-time">{{ Math.round(step.durationSec / 60 * 10) / 10 }} 分钟</span>
                    <span class="step-detail">{{ step.detail }}</span>
                  </li>
                </ol>
                <div class="guide-cautions">
                  <div class="guide-sub">⚠️ 注意</div>
                  <ul>
                    <li v-for="c in s.game.guide.cautions" :key="c">{{ c }}</li>
                  </ul>
                </div>
                <div class="guide-success">✅ {{ s.game.guide.successSignal }}</div>
              </div>
            </template>

            <!-- 打分 / 记录 -->
            <div v-if="!stateOf(s).submitted" class="play-feedback">
              <span class="fb-label">猫咪喜欢吗？</span>
              <div class="fb-stars">
                <button
                  v-for="n in 5"
                  :key="n"
                  type="button"
                  :class="['fb-star', n <= stateOf(s).score ? 'on' : '']"
                  @click="setScore(s, n)"
                >★</button>
              </div>
              <button
                type="button"
                class="fb-submit"
                :disabled="stateOf(s).score < 1 || stateOf(s).submitting"
                @click="submit(s)"
              >{{ stateOf(s).submitting ? '记录中…' : '记录' }}</button>
            </div>
            <div v-else class="play-recorded">已记录 ⭐{{ stateOf(s).score }} · {{ stateOf(s).completion ? '完成' : '中断' }}</div>
          </li>
        </ul>
      </template>
    </div>
  </div>
</template>

<style scoped>
.play-card { flex-direction: column; gap: 8px; }
.play-card .agent-summary-body { width: 100%; }

.play-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.play-header-icon {
  font-size: 20px;
  line-height: 1;
  flex-shrink: 0;
}

.play-header .agent-summary-title {
  margin: 0;
}

.play-list {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

/* 宽屏：未展开指引的游戏卡双列排布，更充分利用横向空间 */
@media (min-width: 600px) {
  .play-list {
    grid-template-columns: repeat(2, 1fr);
  }
}

.play-item {
  background: rgba(255, 251, 240, 0.6);
  border: 1px solid rgba(255, 228, 181, 0.35);
  border-left: 3px solid #FFC078;
  border-radius: 10px;
  padding: 12px 14px;
}

/* 指引展开的卡片跨满整行，保证步骤文字有足够宽度 */
.play-item.expanded {
  grid-column: 1 / -1;
}

.play-item-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.play-thumb {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border-radius: 10px;
  overflow: hidden;
  background: #FFF5DC;
  display: flex;
  align-items: center;
  justify-content: center;
}

.play-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.play-thumb.is-placeholder {
  font-size: 22px;
  border: 1px dashed rgba(255, 192, 120, 0.6);
}

.play-item-info {
  flex: 1;
  min-width: 0;
}

.play-item-name {
  font-size: 14.5px;
  font-weight: 700;
  color: #8B5A2B;
}

.play-item-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 5px;
  font-size: 11px;
  color: #8B7355;
}

.play-item-meta .tag {
  background: #FFF5DC;
  padding: 1px 7px;
  border-radius: 6px;
}

.play-item-score {
  display: flex;
  align-items: baseline;
  gap: 1px;
  flex-shrink: 0;
  color: #FF8A4C;
  font-weight: 800;
  line-height: 1;
}

.play-item-score .score-num {
  font-size: 17px;
}

.play-item-score .score-unit {
  font-size: 10px;
  color: #BC8F6F;
  font-weight: 600;
}

.play-reasons {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  font-size: 12px;
  color: #5D4E37;
}

.play-reasons li {
  position: relative;
  padding-left: 12px;
}

.play-reasons li::before {
  content: '·';
  position: absolute;
  left: 3px;
  color: #FF8A4C;
  font-weight: 800;
}

.play-feedback {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed rgba(255, 228, 181, 0.6);
}

.fb-label {
  font-size: 12px;
  color: #8B7355;
}

.fb-stars {
  display: flex;
  gap: 2px;
}

.fb-star {
  border: none;
  background: none;
  cursor: pointer;
  font-size: 17px;
  line-height: 1;
  color: #D9CFC4;
  padding: 0;
}

.fb-star.on { color: #FFB800; }

.fb-submit {
  margin-left: auto;
  border: none;
  background: linear-gradient(135deg, #FFA065, #FF7A3E);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  padding: 5px 14px;
  border-radius: 999px;
  cursor: pointer;
}

.fb-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.play-recorded {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed rgba(255, 228, 181, 0.6);
  font-size: 12px;
  color: #10B981;
  font-weight: 600;
}

/* ===== 陪玩指引 ===== */
.guide-toggle {
  margin-top: 8px;
  border: none;
  background: none;
  color: #E06A30;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  padding: 2px 0;
}

.guide-body {
  margin-top: 8px;
  padding: 10px 12px;
  background: #FFFBF0;
  border: 1px dashed rgba(255, 228, 181, 0.7);
  border-radius: 10px;
  animation: guideFade 0.25s ease;
}

@keyframes guideFade {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.guide-goal {
  font-size: 12.5px;
  font-weight: 700;
  color: #8B5A2B;
  margin-bottom: 8px;
}

.guide-steps {
  margin: 0 0 8px;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

@media (min-width: 600px) {
  .guide-steps {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px 20px;
  }
}

.guide-steps li {
  font-size: 12px;
  color: #5D4E37;
  line-height: 1.5;
}

.guide-steps .step-title {
  font-weight: 700;
  color: #8B5A2B;
  margin-right: 6px;
}

.guide-steps .step-time {
  font-size: 10.5px;
  color: #BC8F6F;
  background: #FFF5DC;
  padding: 0 6px;
  border-radius: 5px;
  margin-right: 6px;
}

.guide-steps .step-detail {
  display: block;
  margin-top: 1px;
}

.guide-cautions {
  margin-bottom: 8px;
}

.guide-sub {
  font-size: 11.5px;
  font-weight: 700;
  color: #D9822B;
  margin-bottom: 3px;
}

.guide-cautions ul {
  margin: 0;
  padding-left: 16px;
}

.guide-cautions li {
  font-size: 11.5px;
  color: #8B7355;
  line-height: 1.5;
}

.guide-success {
  font-size: 12px;
  color: #10B981;
  font-weight: 600;
  padding-top: 6px;
  border-top: 1px dashed rgba(255, 228, 181, 0.6);
}
</style>
