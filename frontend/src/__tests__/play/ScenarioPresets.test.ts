import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ScenarioPresets from '@/views/Play/components/ScenarioPresets.vue'
import { SCENARIO_PRESETS } from '@/types/play'

describe('ScenarioPresets', () => {
  it('renders 6 buttons + a reset button', () => {
    const wrapper = mount(ScenarioPresets, {
      props: { activeScenarioId: null, loading: false },
    })
    const buttons = wrapper.findAll('button')
    expect(buttons.length).toBe(7)
  })

  it('emits apply with the matching preset when clicked', async () => {
    const wrapper = mount(ScenarioPresets, {
      props: { activeScenarioId: null, loading: false },
    })
    const buttons = wrapper.findAll('button')
    await buttons[0].trigger('click')
    const events = wrapper.emitted('apply') as unknown[][]
    expect(events).toHaveLength(1)
    expect(events[0][0]).toEqual(SCENARIO_PRESETS[0])
  })

  it('emits reset when reset button clicked', async () => {
    const wrapper = mount(ScenarioPresets, {
      props: { activeScenarioId: 'SC1', loading: false },
    })
    const buttons = wrapper.findAll('button')
    await buttons[6].trigger('click')
    expect(wrapper.emitted('reset')).toHaveLength(1)
  })

  it('disables all buttons while loading', () => {
    const wrapper = mount(ScenarioPresets, {
      props: { activeScenarioId: null, loading: true },
    })
    wrapper.findAll('button').forEach(b => {
      expect((b.element as HTMLButtonElement).disabled).toBe(true)
    })
  })

  it('applies active class to currently active scenario button', () => {
    const wrapper = mount(ScenarioPresets, {
      props: { activeScenarioId: 'SC2', loading: false },
    })
    const buttons = wrapper.findAll('button')
    expect(buttons[1].classes()).toContain('is-active')
    expect(buttons[0].classes()).not.toContain('is-active')
  })
})
