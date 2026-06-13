// tests/test-accounts.ts
export const testAccounts = {
  superAdmin: {
    username: 'superadmin',
    password: 'Super@123',
    role: 'super' as const,
    permissions: [
      'user.read', 'user.create', 'user.update', 'user.delete',
      'cat.read', 'cat.update', 'cat.delete',
      'guide.read', 'guide.create', 'guide.update', 'guide.delete', 'guide.sync',
      'template.read', 'template.create', 'template.update', 'template.delete',
      'statistics.view',
      'config.read', 'config.update',
      'log.read', 'log.delete',
    ],
  },
  admin: {
    username: 'admin',
    password: 'Admin@123',
    role: 'admin' as const,
    permissions: [
      'user.read', 'user.create', 'user.update', 'user.delete',
      'cat.read', 'cat.update', 'cat.delete',
      'guide.read', 'guide.create', 'guide.update', 'guide.delete', 'guide.sync',
      'template.read', 'template.create', 'template.update', 'template.delete',
      'statistics.view',
      'log.read',
    ],
  },
  editor: {
    username: 'editor',
    password: 'Editor@123',
    role: 'editor' as const,
    permissions: [
      'guide.read', 'guide.create', 'guide.update', 'guide.sync',
      'template.read', 'template.create', 'template.update',
    ],
  },
}

export const testUsers = {
  normalUser: {
    username: 'testuser',
    email: 'testuser@test.com',
    password: 'Test@123',
    memberType: 'free' as const,
  },
  premiumUser: {
    username: 'premiumuser',
    email: 'premium@test.com',
    password: 'Premium@123',
    memberType: 'premium' as const,
  },
}
