import { describe, it, expect } from 'vitest';
import { getAuthenticatedOperator } from '@/lib/auth/session';
import { OperatorRole } from '@/lib/domain/audit';

describe('auth session adapter', () => {
  it('returns canonical operator session with SUPPORT_REP role', async () => {
    const operator = await getAuthenticatedOperator();

    expect(operator).toEqual({
      id: 'csr-portal-operator',
      name: 'CSR Operator',
      role: OperatorRole.SUPPORT_REP,
      email: 'csr@ampwash.internal',
    });
  });
});
