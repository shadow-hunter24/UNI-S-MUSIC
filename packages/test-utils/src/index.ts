// Placeholder test utilities — expand as test frameworks are added
export function createMockUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    username: 'testuser',
    role: 'LISTENER',
    emailVerified: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}
