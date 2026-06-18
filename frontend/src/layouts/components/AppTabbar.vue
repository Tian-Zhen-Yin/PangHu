<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { computed } from 'vue'

const route = useRoute()

// 底部导航：5 项，第 3 项（喵喵医生）为中央凸起 FAB
const tabItems = computed(() => [
  { name: '首页', path: '/', key: 'home' },
  { name: '记录', path: '/timeline', key: 'record' },
  { name: '喵喵医生', path: '/ai-chat', key: 'agent', highlight: true },
  { name: '指南', path: '/guides', key: 'guide' },
  { name: '我的', path: '/my-cats', key: 'me' }
])

function isActive(path: string): boolean {
  if (path === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(path)
}
</script>

<template>
  <nav class="tabbar">
    <RouterLink
      v-for="item in tabItems"
      :key="item.path"
      :to="item.path"
      class="tab-item"
      :class="{ active: isActive(item.path), 'tab-item--fab': item.highlight }"
    >
      <!-- 中央凸起 FAB：智能体入口 -->
      <template v-if="item.highlight">
        <span class="fab-bubble" :class="{ 'fab-bubble--active': isActive(item.path) }">
          <span class="fab-halo"></span>
          <svg class="fab-icon" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <!-- 对话气泡 -->
            <path
              d="M6 11 C6 7.5, 9 5, 13 5 L19 5 C23 5, 26 7.5, 26 11 L26 16 C26 19.5, 23 22, 19 22 L15 22 L11 26 L11 22 C8 22, 6 20, 6 17.5 Z"
              fill="#FFFFFF"
              stroke="#FFFFFF"
              stroke-width="0.6"
              stroke-linejoin="round"
            />
            <!-- 猫耳 -->
            <path d="M9.5 6.5 L7.5 3 L11 4.6 Z" fill="#FFFFFF" />
            <path d="M22.5 6.5 L24.5 3 L21 4.6 Z" fill="#FFFFFF" />
            <!-- 眼睛 -->
            <circle cx="13" cy="12.5" r="1.2" fill="#D2691E" />
            <circle cx="19" cy="12.5" r="1.2" fill="#D2691E" />
            <!-- 鼻子+嘴 -->
            <path d="M15.4 15.5 L16 16.2 L16.6 15.5 Z" fill="#D2691E" />
            <path d="M16 16.2 L16 17.2" stroke="#D2691E" stroke-width="0.8" stroke-linecap="round" />
            <path d="M16 17.2 C 15 17.8, 14.2 17.4, 13.8 16.8" stroke="#D2691E" stroke-width="0.8" stroke-linecap="round" fill="none" />
            <path d="M16 17.2 C 17 17.8, 17.8 17.4, 18.2 16.8" stroke="#D2691E" stroke-width="0.8" stroke-linecap="round" fill="none" />
          </svg>
        </span>
        <span class="tab-label tab-label--fab">{{ item.name }}</span>
      </template>

      <!-- 普通 Tab -->
      <template v-else>
        <span class="tab-icon">
          <!-- 首页：猫爪印 -->
          <svg v-if="item.key === 'home'" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <ellipse cx="12" cy="15" rx="4" ry="3.2" />
            <ellipse cx="5.5" cy="10.5" rx="1.6" ry="2" />
            <ellipse cx="9.5" cy="6.5" rx="1.6" ry="2" />
            <ellipse cx="14.5" cy="6.5" rx="1.6" ry="2" />
            <ellipse cx="18.5" cy="10.5" rx="1.6" ry="2" />
          </svg>
          <!-- 记录：笔记本 + 猫耳 -->
          <svg v-else-if="item.key === 'record'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M5 7 L6.5 3 L8.5 6" />
            <path d="M19 7 L17.5 3 L15.5 6" />
            <rect x="4" y="7" width="16" height="13" rx="2" />
            <line x1="9" y1="7" x2="9" y2="20" />
            <line x1="12" y1="11" x2="17" y2="11" />
            <line x1="12" y1="14" x2="17" y2="14" />
            <line x1="12" y1="17" x2="15" y2="17" />
          </svg>
          <!-- 指南：翻开的书 -->
          <svg v-else-if="item.key === 'guide'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 5 L12 19" />
            <path d="M12 5 C 10 4, 7 4, 4 5 L 4 19 C 7 18, 10 18, 12 19" />
            <path d="M12 5 C 14 4, 17 4, 20 5 L 20 19 C 17 18, 14 18, 12 19" />
            <path d="M7 10 L10 9.5" />
            <path d="M7 13 L10 12.5" />
            <path d="M14 9.5 L17 10" />
            <path d="M14 12.5 L17 13" />
          </svg>
          <!-- 我的：猫脸剪影 -->
          <svg v-else-if="item.key === 'me'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M5 10 L7 4 L10 8" />
            <path d="M19 10 L17 4 L14 8" />
            <path d="M5 10 C 5 16, 8.5 20, 12 20 C 15.5 20, 19 16, 19 10" />
            <circle cx="9.5" cy="13" r="0.6" fill="currentColor" />
            <circle cx="14.5" cy="13" r="0.6" fill="currentColor" />
            <path d="M11.5 15 L12 15.5 L12.5 15 Z" fill="currentColor" />
            <path d="M12 15.5 L12 16.5" />
            <path d="M12 16.5 C 11 17, 10 16.5, 9.5 16" />
            <path d="M12 16.5 C 13 17, 14 16.5, 14.5 16" />
          </svg>
        </span>
        <span class="tab-label">{{ item.name }}</span>
      </template>
    </RouterLink>
  </nav>
</template>

<style scoped>
.tabbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 64px;
  background: #ffffff;
  border-top: 1px solid var(--color-divider, #F2F2F2);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  /* 给凸起 FAB 留出溢出空间 */
  overflow: visible;
}

@media (min-width: 480px) {
  .tabbar {
    left: 50%;
    transform: translateX(-50%);
    width: 430px;
    max-width: calc(100vw - 32px);
    right: auto;
  }
}

.tab-item {
  flex: 1;
  text-align: center;
  text-decoration: none;
  color: #999999;
  padding: 8px 0;
  transition: color 0.2s ease;
  position: relative;
}

.tab-item.active {
  color: var(--color-primary, #FFB86C);
}

.tab-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin: 0 auto 2px;
}

.tab-icon svg {
  width: 24px;
  height: 24px;
}

.tab-label {
  font-size: 11px;
}

/* ============ 中央凸起 FAB（智能体入口） ============ */
.tab-item--fab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  padding-top: 0;
  padding-bottom: 6px;
  /* FAB 整体跟随 active 颜色，但实际颜色由 .fab-bubble 自己控制 */
  color: #999999;
}

.tab-item--fab.active {
  color: var(--color-primary, #FFB86C);
}

.fab-bubble {
  position: relative;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #FFD89B 0%, #FFB86C 50%, #F4A261 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  /* 向上凸起 22px */
  margin-top: -28px;
  margin-bottom: 4px;
  box-shadow:
    0 8px 20px rgba(255, 184, 108, 0.45),
    0 4px 8px rgba(244, 162, 97, 0.3),
    inset 0 -2px 4px rgba(244, 162, 97, 0.25),
    inset 0 2px 4px rgba(255, 255, 255, 0.4);
  border: 3px solid #ffffff;
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275),
              box-shadow 0.3s ease;
  animation: fabFloat 3.6s ease-in-out infinite;
}

.fab-bubble:active {
  transform: scale(0.92);
}

.fab-bubble--active {
  transform: scale(1.05);
  box-shadow:
    0 10px 26px rgba(255, 184, 108, 0.6),
    0 4px 10px rgba(244, 162, 97, 0.4),
    inset 0 -2px 4px rgba(244, 162, 97, 0.3),
    inset 0 2px 4px rgba(255, 255, 255, 0.5);
}

.fab-bubble--active .fab-halo {
  animation: fabHaloPulse 1.8s ease-in-out infinite;
  opacity: 1;
}

.fab-halo {
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 184, 108, 0.45) 0%, rgba(255, 184, 108, 0) 70%);
  opacity: 0;
  pointer-events: none;
}

.fab-icon {
  width: 30px;
  height: 30px;
  position: relative;
  z-index: 1;
  filter: drop-shadow(0 1px 2px rgba(180, 90, 30, 0.25));
}

.tab-label--fab {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.3px;
  color: #8B4513;
}

.tab-item--fab.active .tab-label--fab {
  color: #D2691E;
}

@keyframes fabFloat {
  0%, 100% { transform: translateY(0) }
  50%      { transform: translateY(-2px) }
}

.fab-bubble--active {
  animation: none; /* 激活态停下漂浮，由 halo 表达活跃 */
}

@keyframes fabHaloPulse {
  0%, 100% { transform: scale(1);   opacity: 0.85 }
  50%      { transform: scale(1.15); opacity: 0.4 }
}

/* 移动端窄屏避免 FAB 与边缘文字粘连 */
@media (max-width: 360px) {
  .fab-bubble {
    width: 50px;
    height: 50px;
    margin-top: -24px;
  }
  .fab-icon { width: 26px; height: 26px }
  .tab-label { font-size: 10px }
}
</style>
