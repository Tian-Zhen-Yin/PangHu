export function mapApiTypeToVisualType(apiType: string): string {
  const typeMap: Record<string, string> = {
    daily: 'general',
    vaccine: 'vaccine',
    deworm: 'vaccine',
    healthCheck: 'medical',
    free: 'general',
    weight: 'weight',
    general: 'general',
    medical: 'medical'
  }
  return typeMap[apiType] || 'general'
}

export function getRecordIcon(type: string): string {
  const baseSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">`

  const iconMap: Record<string, string> = {
    weight: `${baseSvg}<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>`,
    vaccine: `${baseSvg}<path d="m18 2 4 4"/><path d="m17 7 3-3"/><path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-1.5 0-2.8L15 5"/><path d="m9 11 4 4"/><path d="m5 19-3 3"/><path d="m14 4 6 6"/></svg>`,
    general: `${baseSvg}<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
    medical: `${baseSvg}<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`
  }
  return iconMap[type] || `${baseSvg}<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
}

export function getRecordTypeLabel(type: string): string {
  const labelMap: Record<string, string> = {
    daily: '日常',
    vaccine: '免疫',
    deworm: '驱虫',
    healthCheck: '体检',
    free: '记录',
    weight: '体重',
    general: '日常',
    medical: '就医'
  }
  return labelMap[type] || '日常'
}
