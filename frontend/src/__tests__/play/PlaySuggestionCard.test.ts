import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { successResult, fallbackResult } from './fixtures'

vi.mock('@/api/play', () => ({
  submitPlayFeedback: vi.fn(),
}))
import { submitPlayFeedback } from '@/api/play'
import PlaySuggestionCard from '@/views/Play/components/PlaySuggestionCard.vue'

describe('PlaySuggestionCard', () => {
  beforeEach(() => { vi.clearAllMocks() })

  const baseProps = {
    suggestion: successResult.suggestions[0],
    fallback: false,
    catId: 'c1',
    position: 0,
  }

  it('renders score when not fallback', () => {
    const wrapper = mount(PlaySuggestionCard, { props: baseProps })
    expect(wrapper.find('[data-testid="card-score"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('92')
  })

  it('does not render score when fallback', () => {
    const wrapper = mount(PlaySuggestionCard, {
      props: { ...baseProps, suggestion: fallbackResult.suggestions[0], fallback: true },
    })
    expect(wrapper.find('[data-testid="card-score"]').exists()).toBe(false)
  })

  it('disables submit until score >= 1', async () => {
    const wrapper = mount(PlaySuggestionCard, { props: baseProps })
    const submit = wrapper.get('[data-testid="card-submit"]')
    expect((submit.element as HTMLButtonElement).disabled).toBe(true)

    await wrapper.get('[data-testid="star-4"]').trigger('click')
    expect((submit.element as HTMLButtonElement).disabled).toBe(false)
  })

  it('submits feedback with current values and switches to recorded state', async () => {
    ;(submitPlayFeedback as any).mockResolvedValueOnce({ success: true, data: { id: 'fb1' }, message: '', error: null })
    const wrapper = mount(PlaySuggestionCard, { props: baseProps })
    await wrapper.get('[data-testid="star-5"]').trigger('click')
    await wrapper.get('[data-testid="card-submit"]').trigger('click')
    await flushPromises()

    expect(submitPlayFeedback).toHaveBeenCalledWith(expect.objectContaining({
      catId: 'c1',
      gameId: 'feather-fishing',
      score: 5,
      completion: true,
      actualDuration: 10,
    }))
    expect(wrapper.find('[data-testid="card-recorded"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="card-edit"]').exists()).toBe(true)
  })

  it('clicking edit re-opens the form after submit', async () => {
    ;(submitPlayFeedback as any).mockResolvedValueOnce({ success: true, data: { id: 'fb1' }, message: '', error: null })
    const wrapper = mount(PlaySuggestionCard, { props: baseProps })
    await wrapper.get('[data-testid="star-3"]').trigger('click')
    await wrapper.get('[data-testid="card-submit"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="card-edit"]').trigger('click')
    expect(wrapper.find('[data-testid="card-submit"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="card-recorded"]').exists()).toBe(false)
  })
})
