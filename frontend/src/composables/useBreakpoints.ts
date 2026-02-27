import { ref, onMounted, onUnmounted } from 'vue'

export function useBreakpoints() {
  const isMobile = ref(false)
  const isTablet = ref(false)
  const isDesktop = ref(false)

  const checkBreakpoints = () => {
    isMobile.value = window.innerWidth < 768
    isTablet.value = window.innerWidth >= 768 && window.innerWidth < 1024
    isDesktop.value = window.innerWidth >= 1024
  }

  onMounted(() => {
    checkBreakpoints()
    window.addEventListener('resize', checkBreakpoints)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', checkBreakpoints)
  })

  return {
    isMobile,
    isTablet,
    isDesktop
  }
}
