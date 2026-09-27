"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Building2, Plus, Users, Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"

type OrgMember = {
  id: string
  role: string
  user: { id: string; name: string | null; email: string; image: string | null }
}

type Organization = {
  id: string
  name: string
  slug: string
  description: string | null
  role: string
  _count: { members: number }
}

export function OrganizationManager() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
  const [members, setMembers] = useState<OrgMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newOrgName, setNewOrgName] = useState("")
  const [newOrgDesc, setNewOrgDesc] = useState("")

  const loadOrganizations = async () => {
    try {
      const res = await fetch("/api/organizations")
      const data = await res.json()
      setOrganizations(data.organizations || [])
    } catch {
      toast.error("Failed to load organizations")
    } finally {
      setIsLoading(false)
    }
  }

  const loadMembers = async (orgId: string) => {
    try {
      const res = await fetch(`/api/organizations/${orgId}/members`)
      const data = await res.json()
      setMembers(data.members || [])
    } catch {
      toast.error("Failed to load members")
    }
  }

  useEffect(() => { loadOrganizations() }, [])

  useEffect(() => {
    if (selectedOrg) loadMembers(selectedOrg.id)
  }, [selectedOrg])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newOrgName.trim()) return
    setIsCreating(true)
    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newOrgName, description: newOrgDesc }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success("Organization created!")
      setShowCreate(false)
      setNewOrgName("")
      setNewOrgDesc("")
      await loadOrganizations()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create organization")
    } finally {
      setIsCreating(false)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!selectedOrg) return
    try {
      const res = await fetch(`/api/organizations/${selectedOrg.id}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })
      if (!res.ok) throw new Error("Failed to remove member")
      toast.success("Member removed")
      await loadMembers(selectedOrg.id)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to remove member")
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Organizations</h3>
          <p className="text-sm text-muted-foreground">Manage your teams and organizations.</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
          <Plus className="h-4 w-4 mr-2" />
          New Organization
        </Button>
      </div>

      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create Organization</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">Name</Label>
                <Input
                  id="org-name"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="Acme Inc."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-desc">Description (optional)</Label>
                <Input
                  id="org-desc"
                  value={newOrgDesc}
                  onChange={(e) => setNewOrgDesc(e.target.value)}
                  placeholder="What does your organization do?"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={isCreating}>
                  {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {organizations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium mb-1">No organizations yet</h3>
            <p className="text-sm text-muted-foreground">Create an organization to collaborate with your team.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            {organizations.map((org) => (
              <Card
                key={org.id}
                className={`cursor-pointer transition-colors hover:border-primary ${selectedOrg?.id === org.id ? "border-primary" : ""}`}
                onClick={() => setSelectedOrg(org)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{org.name}</p>
                      {org.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{org.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={org.role === "owner" ? "default" : "secondary"} className="text-xs">
                        {org.role}
                      </Badge>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {org._count.members}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {selectedOrg && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{selectedOrg.name} — Members</CardTitle>
                <CardDescription>{members.length} member{members.length !== 1 ? "s" : ""}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {members.map((m, i) => (
                  <div key={m.id}>
                    {i > 0 && <Separator className="mb-3" />}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{m.user.name || m.user.email}</p>
                        <p className="text-xs text-muted-foreground">{m.user.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={m.role === "owner" ? "default" : "secondary"} className="text-xs">
                          {m.role}
                        </Badge>
                        {selectedOrg.role === "owner" && m.role !== "owner" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleRemoveMember(m.user.id)}
                            aria-label={`Remove ${m.user.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
