import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/play', () => ({
  updatePlayProfile: vi.fn(),
}))
import { updatePlayProfile } from '@/api/play'
import PlayProfileSetup from '@/views/Play/components/PlayProfileSetup.vue'

describe('PlayProfileSetup', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('disables submit until personality and energyBaseline are both set', async () => {
    const wrapper = mount(PlayProfileSetup, { props: { catId: 'c1' } })
    const submit = wrapper.get('[data-testid="profile-submit"]')
    expect((submit.element as HTMLButtonElement).disabled).toBe(true)

    await wrapper.get('[data-testid="personality-active"]').trigger('click')
    expect((submit.element as HTMLButtonElement).disabled).toBe(true)

    await wrapper.get('[data-testid="energy-3"]').trigger('click')
    expect((submit.element as HTMLButtonElement).disabled).toBe(false)
  })

  it('calls updatePlayProfile and onCompleted on submit success', async () => {
    ;(updatePlayProfile as any).mockResolvedValueOnce({ success: true, data: null, message: '', error: null })
    const onCompleted = vi.fn()
    const wrapper = mount(PlayProfileSetup, { props: { catId: 'c1', onCompleted } })

    await wrapper.get('[data-testid="personality-curious"]').trigger('click')
    await wrapper.get('[data-testid="energy-4"]').trigger('click')
    await wrapper.get('[data-testid="health-senior"]').trigger('click')
    await wrapper.get('[data-testid="profile-submit"]').trigger('click')
    await flushPromises()

    expect(updatePlayProfile).toHaveBeenCalledWith('c1', {
      personality: 'curious',
      energyBaseline: 4,
      healthTags: ['senior'],
    })
    expect(onCompleted).toHaveBeenCalled()
  })
})
