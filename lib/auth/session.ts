import { OperatorRole, type CsrOperator } from '@/lib/domain/audit';

/**
 * Canonical session adapter for the CSR portal.
 *
 * Provides the active authenticated operator for Server Actions and audit logs.
 * When real authentication (e.g. NextAuth, Clerk, WorkOS, Okta) is integrated,
 * replace the body of this function with `const session = await auth(); return session.user;`.
 */
export async function getAuthenticatedOperator(): Promise<CsrOperator> {
  return {
    id: 'csr-portal-operator',
    name: 'CSR Operator',
    role: OperatorRole.SUPPORT_REP,
    email: 'csr@ampwash.internal',
  };
}
