<script setup lang="ts">
import { computed } from 'vue'
import { useTimelineState } from './composables/useTimelineState.js'
import MascotCharacter from '../../components/mascot/MascotCharacter.vue'
import type { Vaccine } from '../../types/cat.js'

const {
  selectedStage,
  currentCat,
} = useTimelineState()

// 健康进度相关计算属性
const healthProgressPercent = computed(() => {
  if (!selectedStage.value?.vaccines || selectedStage.value.vaccines.length === 0) return 0
  const catAgeWeeks = currentCat.value?.ageMonths ? currentCat.value.ageMonths * 4 : 0
  const totalVaccines = selectedStage.value.vaccines.length
  const completedVaccines = selectedStage.value.vaccines.filter(v => v.ageWeeks <= catAgeWeeks).length
  return totalVaccines > 0 ? Math.round((completedVaccines / totalVaccines) * 100) : 0
})

const healthProgressSummary = computed(() => {
  const percent = healthProgressPercent.value
  if (percent >= 100) return '基础免疫已全部完成，真棒！'
  if (percent >= 66) return '已完成基础免疫 2/3，继续保持喵！'
  if (percent >= 33) return '已完成基础免疫 1/3，加油喵~'
  return '免疫计划进行中，记得按时接种哦'
})

const healthProgressMascot = computed(() => {
  const percent = healthProgressPercent.value
  if (percent >= 100) return 'excited'
  if (percent >= 66) return 'happy'
  if (percent >= 33) return 'focused'
  return 'waiting'
})

// 判断疫苗是否已完成（基于年龄）
function isVaccineDone(vaccine: Vaccine): boolean {
  if (!currentCat.value) return false
  const catAgeWeeks = currentCat.value.ageMonths ? currentCat.value.ageMonths * 4 : 0
  return vaccine.ageWeeks <= catAgeWeeks
}

// 获取疫苗状态样式类
function getVaccineStatus(vaccine: Vaccine): string {
  if (isVaccineDone(vaccine)) return 'done'
  return 'active'
}
</script>

<template>
  <!-- 疫苗接种内容 - 健康屏障 -->
  <div class="tab-content" v-if="selectedStage">
    <!-- 健康进度摘要卡片 -->
    <div class="health-summary-card">
      <div class="summary-text">
        <h3>{{ currentCat?.name || '小猫咪' }}的免疫屏障</h3>
        <p>{{ healthProgressSummary }}</p>
      </div>
      <div class="progress-track">
        <div class="progress-fill" :style="{ width: healthProgressPercent + '%' }"></div>
        <MascotCharacter :expression="healthProgressMascot" size="small" :animated="false" class="progress-mascot" />
      </div>
    </div>

    <!-- 健康时间轴 -->
    <div v-if="selectedStage.vaccines && selectedStage.vaccines.length > 0" class="health-timeline">
      <div
        v-for="(vaccine, index) in selectedStage.vaccines"
        :key="vaccine.id"
        :class="['health-row', getVaccineStatus(vaccine)]"
      >
        <!-- 时间轴节点 -->
        <div class="axis-node">
          <div class="status-indicator">
            <!-- 已完成：勾选图标 -->
            <svg v-if="isVaccineDone(vaccine)" class="check-icon" viewBox="0 0 24 24">
              <path d="M5 13l4 4L19 7" stroke-width="2.5" stroke="white" fill="none"/>
            </svg>
            <!-- 进行中：脉冲点 -->
            <div v-else class="active-pulse"></div>
          </div>
          <div v-if="index !== selectedStage.vaccines.length - 1" class="connector-line"></div>
        </div>

        <!-- 健康信息卡片 -->
        <div class="health-info-card">
          <header class="card-header">
            <span class="category-tag">疫苗</span>
            <span class="status-badge" :class="isVaccineDone(vaccine) ? 'done' : 'pending'">
              {{ isVaccineDone(vaccine) ? '已完成' : '待接种' }}
            </span>
          </header>
          <h4 class="card-title">{{ vaccine.name }}</h4>
          <p v-if="vaccine.description" class="card-description">{{ vaccine.description }}</p>

          <!-- 卡片底部 -->
          <footer class="card-footer">
            <div class="time-info">
              <svg class="clock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
              <span>建议接种：{{ vaccine.ageWeeks }}周龄</span>
            </div>
            <!-- 胖虎医学小贴士 -->
            <div class="medical-tip" v-if="!isVaccineDone(vaccine)">
              <MascotCharacter expression="focused" size="small" :animated="false" class="tip-mascot" />
              <span>接种前3天不要洗澡哦，小猫咪会怕怕！</span>
            </div>
          </footer>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-health">
      <MascotCharacter expression="confused" size="medium" :animated="false" />
      <p class="empty-text">此阶段无需接种特殊疫苗</p>
    </div>
  </div>
</template>

<style scoped>
/* 内容区 */
.tab-content {
  animation: tabFadeIn 0.3s ease;
}

@keyframes tabFadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ================= 健康屏障 - 时间轴样式 ================= */
/* 健康进度摘要卡片 */
.health-summary-card {
  background: linear-gradient(145deg, var(--color-bg-warm) 0%, var(--color-bg-warm) 100%);
  border: 1px solid #FFFFFF;
  border-radius: 24px;
  padding: 20px 24px;
  margin-bottom: 24px;
  box-shadow: 0 4px 16px rgba(244, 162, 97, 0.06);
}

.summary-text h3 {
  margin: 0 0 6px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.summary-text p {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-placeholder);
}

.progress-track {
  position: relative;
  height: 8px;
  background: var(--color-border-light);
  border-radius: 100px;
  margin-top: 16px;
  overflow: hidden;
}

.progress-track .progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary-gradient) 0%, var(--color-primary) 100%);
  border-radius: 100px;
  transition: width 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.progress-mascot {
  position: absolute;
  right: -12px;
  top: 50%;
  transform: translateY(-50%);
}

/* 健康时间轴 */
.health-timeline {
  display: flex;
  flex-direction: column;
}

.health-row {
  display: flex;
  gap: 16px;
  position: relative;
  margin-bottom: 20px;
}

/* 时间轴节点 */
.axis-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
}

.status-indicator {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  z-index: 2;
}

/* 完成状态 */
.health-row.done .status-indicator {
  background: var(--color-success);
  box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.15);
}

.health-row.done .check-icon {
  width: 14px;
  height: 14px;
}

/* 进行中状态 */
.health-row.active .status-indicator {
  background: var(--color-primary-medium);
  box-shadow: 0 0 0 4px rgba(244, 162, 97, 0.2);
}

.active-pulse {
  width: 12px;
  height: 12px;
  background: var(--color-primary-medium);
  border-radius: 50%;
  animation: ripple 2s infinite;
}

@keyframes ripple {
  0% { box-shadow: 0 0 0 0 rgba(244, 162, 97, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(244, 162, 97, 0); }
  100% { box-shadow: 0 0 0 0 rgba(244, 162, 97, 0); }
}

/* 连接线 */
.connector-line {
  width: 2px;
  flex: 1;
  background: var(--color-border-light);
  margin-top: 4px;
}

.health-row.done .connector-line {
  background: var(--color-success);
}

.health-row.active .connector-line {
  background: linear-gradient(180deg, var(--color-primary-gradient) 0%, var(--color-border-light) 50%);
}

/* 健康信息卡片 */
.health-info-card {
  flex: 1;
  background: #FFFFFF;
  border: 2px solid transparent;
  border-radius: 20px;
  padding: 16px 20px;
  transition: all 0.3s ease;
}

.health-row.done .health-info-card {
  opacity: 0.6;
  background: var(--color-bg-warm);
}

.health-row.active .health-info-card {
  border-color: var(--color-primary-medium);
  box-shadow: 0 4px 16px rgba(244, 162, 97, 0.12);
}

.health-info-card .card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.category-tag {
  padding: 4px 12px;
  background: var(--color-bg-cream);
  color: var(--color-primary);
  font-size: 11px;
  font-weight: 700;
  border-radius: 100px;
}

.card-title {
  margin: 0 0 6px 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.card-description {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-placeholder);
  line-height: 1.5;
}

/* 状态徽章 */
.status-badge {
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 700;
  border-radius: 100px;
}

.status-badge.done {
  background: #DCFCE7;
  color: var(--color-success);
}

.status-badge.pending {
  background: #FEF3C7;
  color: #F59E0B;
}

/* 卡片底部 */
.card-footer {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--color-bg-block-hover);
}

.time-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--color-text-placeholder);
}

.clock-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

/* 医学小贴士 */
.medical-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: linear-gradient(135deg, var(--color-bg-warm) 0%, var(--color-bg-cream) 100%);
  border-radius: 12px;
  border: 1px dashed var(--color-primary-medium);
}

.tip-mascot {
  flex-shrink: 0;
}

.medical-tip span {
  font-size: 12px;
  color: #9A3412;
  line-height: 1.4;
}

/* 健康空状态 */
.empty-health {
  text-align: center;
  padding: 40px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.empty-health .empty-text {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-placeholder);
}
</style>
