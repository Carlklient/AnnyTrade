/** Protect sensitive user data in admin responses. */

export function redactEmail(email: string): string {
  const [local = "", domain] = email.split("@");
  if (!domain) return "***";
  const keep = local.slice(0, Math.min(2, local.length));
  return `${keep}***@${domain}`;
}

export function redactUserForAdmin(row: {
  id: string;
  email: string;
  display_name: string;
  status: string;
  email_verified: boolean;
  created_at: Date;
}) {
  return {
    id: row.id,
    emailRedacted: redactEmail(row.email),
    displayName: row.display_name,
    status: row.status,
    emailVerified: row.email_verified,
    createdAt: row.created_at.toISOString(),
  };
}
