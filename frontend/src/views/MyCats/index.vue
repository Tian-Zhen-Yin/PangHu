<template>
  <div class="my-cats-page">
    <div class="page-header">
      <h1>我的猫咪</h1>
      <div class="header-actions">
        <button
          v-if="cats.length >= 2"
          class="btn-secondary"
          @click="$router.push('/my-cats/compare')"
        >
          📊 多猫对比
        </button>
        <button class="btn-primary" @click="$router.push('/my-cats/new')">＋ 添加猫咪</button>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <MascotCharacter
        expression="yawning"
        size="large"
        :animated="true"
        :float-animation="true"
      />
      <p class="loading-text">正在加载猫咪数据...</p>
    </div>

    <EmptyState
      v-else-if="cats.length === 0"
      title="还没有添加猫咪档案"
      description="添加你的第一只喵星人，开始记录成长足迹"
      expression="confused"
      :show-action="true"
      action-text="添加第一只猫咪"
      :action-path="'/my-cats/new'"
      @action="() => $router.push('/my-cats/new')"
    />

    <div v-else class="cats-grid">
      <div
        v-for="cat in cats"
        :key="cat.id"
        class="cat-card"
        :class="{ active: cat.id === currentCat?.id }"
        @click="handleSelectCat(cat)"
      >
        <div class="cat-card-header">
          <div class="cat-avatar">
            <img v-if="cat.avatar" :src="cat.avatar" :alt="cat.name" />
            <span v-else class="avatar-placeholder">🐱</span>
          </div>
          <div v-if="cat.id === currentCat?.id" class="active-badge">当前</div>
        </div>

        <div class="cat-card-body">
          <h3>{{ cat.name }}</h3>
          <p class="cat-meta">{{ cat.breed || '未知品种' }} · {{ cat.gender === 'male' ? '公' : cat.gender === 'female' ? '母' : '未知' }}</p>
          <p class="cat-age">{{ cat.ageFormatted }}</p>
          <p v-if="cat.weight" class="cat-weight">{{ cat.weight }} kg</p>
        </div>

        <div class="cat-card-footer">
          <button class="btn-sm" @click.stop="$router.push(`/my-cats/${cat.id}`)">详情</button>
          <button class="btn-sm" @click.stop="$router.push(`/my-cats/${cat.id}/edit`)">编辑</button>
          <button class="btn-sm" @click.stop="$router.push(`/my-cats/${cat.id}/vaccines`)">疫苗</button>
          <button class="btn-sm danger" @click.stop="handleDelete(cat.id)">删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useMyCatStore } from '../../stores/myCat'
import EmptyState from '../../components/common/EmptyState.vue'
import MascotCharacter from '../../components/mascot/MascotCharacter.vue'
import type { Cat } from '../../types/cat'

const catStore = useMyCatStore()
const { cats, currentCat, loading } = storeToRefs(catStore)

onMounted(() => catStore.fetchCats())

function handleSelectCat(cat: Cat) {
  catStore.selectCat(cat)
}

async function handleDelete(id: string) {
  if (!confirm('确定要删除这只猫咪的档案吗？')) return
  await catStore.deleteCat(id)
}
</script>

<style scoped>
.my-cats-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px 16px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.page-header h1 {
  font-size: 24px;
  font-weight: 700;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-5xl) var(--space-xl);
  gap: var(--space-lg);
}

.loading-text {
  font-size: var(--text-base);
  color: var(--color-text-sub);
  margin: 0;
}

.cats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.cat-card {
  border: 2px solid #f0f0f0;
  border-radius: 16px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
}

.cat-card:hover {
  border-color: #ffb89a;
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.1);
}

.cat-card.active {
  border-color: #ff6b35;
  background: #fff8f5;
}

.cat-card-header {
  position: relative;
  display: flex;
  justify-content: center;
  margin-bottom: 12px;
}

.cat-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
}

.cat-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  font-size: 36px;
}

.active-badge {
  position: absolute;
  top: 0;
  right: 0;
  background: #ff6b35;
  color: white;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
}

.cat-card-body {
  text-align: center;
  margin-bottom: 12px;
}

.cat-card-body h3 {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 4px;
}

.cat-meta, .cat-age, .cat-weight {
  font-size: 12px;
  color: #888;
  margin: 2px 0;
}

.cat-card-footer {
  display: flex;
  gap: 6px;
  justify-content: center;
}

.btn-primary {
  background: #ff6b35;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}

.btn-secondary {
  background: white;
  color: #666;
  border: 1px solid #e0e0e0;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: #f5f5f5;
  border-color: #ccc;
}

.btn-sm {
  background: #f5f5f5;
  border: none;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
}

.btn-sm:hover {
  background: #e8e8e8;
}

.btn-sm.danger:hover {
  background: #ffe0e0;
  color: #e53e3e;
}
</style>
