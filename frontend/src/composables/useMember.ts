import { computed } from 'vue'
import { useAuthStore } from '../stores/auth'

export function useMember() {
  const authStore = useAuthStore()
  const isPremium = computed(() => authStore.user?.memberType === 'premium')
  return { isPremium }
}
