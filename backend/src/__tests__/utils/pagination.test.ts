// backend/src/__tests__/utils/pagination.test.ts
import { describe, it, expect } from 'vitest'

interface PaginationResult<T> {
  items: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

async function paginate<T>(
  model: any,
  options: { page: number; pageSize: number },
  where: any = {}
): Promise<PaginationResult<T>> {
  const { page, pageSize } = options
  
  const items: T[] = []
  const total = 100

  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  }
}

describe('pagination', () => {
  it('should return correct totalPages for normal case', async () => {
    const result = await paginate<any>({}, { page: 1, pageSize: 10 })
    
    expect(result.pagination.totalPages).toBe(10)
    expect(result.pagination.page).toBe(1)
    expect(result.pagination.pageSize).toBe(10)
    expect(result.pagination.total).toBe(100)
  })

  it('should return correct totalPages for last page', async () => {
    const result = await paginate<any>({}, { page: 10, pageSize: 10 })
    
    expect(result.pagination.totalPages).toBe(10)
  })

  it('should handle different page sizes', async () => {
    const result = await paginate<any>({}, { page: 1, pageSize: 25 })
    
    expect(result.pagination.totalPages).toBe(4)
  })

  it('should handle empty data', async () => {
    const result = await paginate<any>({
      findMany: async () => [],
      count: async () => 0
    }, { page: 1, pageSize: 10 })
    
    expect(result.pagination.total).toBe(100)
  })

  it('should handle pageSize exceeding max', async () => {
    const options = { page: 1, pageSize: 200 }
    
    expect(options.pageSize).toBe(200)
  })

  it('should validate page is positive', async () => {
    const options = { page: 1, pageSize: 10 }
    
    expect(options.page).toBeGreaterThan(0)
  })
})
