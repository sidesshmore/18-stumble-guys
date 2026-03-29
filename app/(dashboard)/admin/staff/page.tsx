'use client'

import { useState, useEffect, useCallback } from 'react'
import { UserCog, Mail, Plus, Trash2, RefreshCw, ShieldCheck, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface StaffMember {
  id: string
  email: string
  full_name: string | null
  role: 'admin' | 'staff'
  created_at: string
  confirmed: boolean
  email_confirmed_at: string | null
  last_sign_in_at: string | null
  invited_at: string | null
}

const roleBadge = {
  admin: 'bg-indigo-100 text-indigo-800',
  staff: 'bg-zinc-100 text-zinc-700',
}

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Invite form state
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'staff'>('staff')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)

  const [removingId, setRemovingId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const loadStaff = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/staff')
      if (!res.ok) {
        const { error: e } = await res.json()
        if (res.status === 403) { setError('Access denied. Admin role required.'); return }
        setError(e ?? 'Failed to load staff.')
        return
      }
      const { staff: data } = await res.json()
      setStaff(data ?? [])
    } catch {
      setError('Network error.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadStaff() }, [loadStaff])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviting(true)
    setInviteError(null)
    setInviteSuccess(null)

    const res = await fetch('/api/admin/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, full_name: inviteName, role: inviteRole }),
    })
    const data = await res.json()
    setInviting(false)

    if (!res.ok) {
      setInviteError(data.error ?? 'Invite failed.')
      return
    }

    setInviteSuccess(`Invite sent to ${inviteEmail}`)
    setInviteEmail('')
    setInviteName('')
    setInviteRole('staff')
    setShowInvite(false)
    loadStaff()
  }

  async function handleRemove(id: string, email: string) {
    if (!confirm(`Remove ${email} from your organisation? This cannot be undone.`)) return
    setRemovingId(id)
    await fetch(`/api/admin/staff/${id}`, { method: 'DELETE' })
    setRemovingId(null)
    loadStaff()
  }

  async function handleRoleChange(id: string, newRole: 'admin' | 'staff') {
    setUpdatingId(id)
    await fetch(`/api/admin/staff/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    })
    setUpdatingId(null)
    loadStaff()
  }

  if (error === 'Access denied. Admin role required.') {
    return (
      <main id="main-content" className="p-6">
        <p role="alert" className="text-destructive">Access denied. Admin role required.</p>
      </main>
    )
  }

  return (
    <main id="main-content" className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <UserCog className="h-6 w-6 text-primary" aria-hidden="true" />
          <div>
            <h1 className="text-2xl font-bold">Staff Management</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Invite and manage your organisation's staff members.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadStaff}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-md border hover:bg-muted transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <button
            onClick={() => setShowInvite(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Invite Staff
          </button>
        </div>
      </div>

      {inviteSuccess && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-md bg-green-50 border border-green-200 text-green-800 text-sm">
          <Mail className="h-4 w-4 shrink-0" />
          {inviteSuccess}
        </div>
      )}

      {/* Invite Form */}
      {showInvite && (
        <div className="rounded-lg border bg-card p-5 shadow-sm space-y-4">
          <h2 className="text-base font-semibold">Invite a New Staff Member</h2>
          <p className="text-sm text-muted-foreground">
            They will receive an email with a magic link to set up their account.
          </p>
          <form onSubmit={handleInvite} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label htmlFor="invite-name" className="text-sm font-medium">Full Name</label>
              <input
                id="invite-name"
                type="text"
                required
                value={inviteName}
                onChange={e => setInviteName(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Jane Smith"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="invite-email" className="text-sm font-medium">Email</label>
              <input
                id="invite-email"
                type="email"
                required
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="jane@example.org"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="invite-role" className="text-sm font-medium">Role</label>
              <select
                id="invite-role"
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value as 'admin' | 'staff')}
                className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background"
              >
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {inviteError && (
              <p className="md:col-span-3 text-sm text-destructive">{inviteError}</p>
            )}
            <div className="md:col-span-3 flex gap-2">
              <button
                type="submit"
                disabled={inviting}
                className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {inviting ? 'Sending invite…' : 'Send Invite'}
              </button>
              <button
                type="button"
                onClick={() => setShowInvite(false)}
                className="px-4 py-2 text-sm rounded-md border hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Staff Table */}
      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h2 className="text-base font-semibold">
            Team Members
            {!loading && <span className="ml-2 text-sm font-normal text-muted-foreground">({staff.length})</span>}
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading staff…</div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-destructive">{error}</div>
        ) : staff.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No staff members yet. Invite someone above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Staff members">
              <thead>
                <tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Last Sign In</th>
                  <th className="px-4 py-3 font-medium hidden lg:table-cell">Joined</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {staff.map(member => (
                  <tr key={member.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium">
                      {member.full_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        {member.email}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={member.role}
                        disabled={updatingId === member.id}
                        onChange={e => handleRoleChange(member.id, e.target.value as 'admin' | 'staff')}
                        className={cn(
                          'text-xs font-semibold px-2 py-1 rounded border-0 cursor-pointer focus:ring-2 focus:ring-primary',
                          roleBadge[member.role]
                        )}
                        aria-label={`Change role for ${member.full_name ?? member.email}`}
                      >
                        <option value="staff">Staff</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {member.confirmed ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <ShieldCheck className="h-3 w-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                          <Clock className="h-3 w-3" />
                          Pending invite
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      {member.last_sign_in_at
                        ? format(new Date(member.last_sign_in_at), 'MMM d, yyyy h:mm a')
                        : <span className="text-muted-foreground/50">Never</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                      {format(new Date(member.created_at), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleRemove(member.id, member.email)}
                        disabled={removingId === member.id}
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded border text-destructive border-destructive/30 hover:bg-destructive/10 disabled:opacity-50 transition-colors"
                        aria-label={`Remove ${member.full_name ?? member.email}`}
                      >
                        {removingId === member.id
                          ? <span className="animate-spin h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full" />
                          : <Trash2 className="h-3.5 w-3.5" />}
                        {removingId === member.id ? 'Removing…' : 'Remove'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info box */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
        <strong>How invites work:</strong> The invited person receives an email with a magic link.
        When they click it, their account is created and they are redirected to the dashboard.
        Status shows <strong>Pending invite</strong> until they confirm their email.
        Role can be changed at any time by selecting from the Role dropdown.
      </div>
    </main>
  )
}
