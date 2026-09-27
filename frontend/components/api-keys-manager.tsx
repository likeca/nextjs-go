"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Key, Copy, Trash2, Plus } from "lucide-react"

interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  lastUsedAt: string | null
  createdAt: string
  expiresAt: string | null
}

export function ApiKeyManager() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newKeyName, setNewKeyName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null)

  const fetchKeys = async () => {
    try {
      const res = await fetch("/api/api-keys")
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setKeys(data.keys)
    } catch {
      toast.error("Failed to load API keys")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchKeys()
  }, [])

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toast.error("Please enter a name for the API key")
      return
    }
    setIsCreating(true)
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName }),
      })
      if (!res.ok) throw new Error("Failed to create")
      const data = await res.json()
      setNewlyCreatedKey(data.key)
      setNewKeyName("")
      await fetchKeys()
      toast.success("API key created!")
    } catch {
      toast.error("Failed to create API key")
    } finally {
      setIsCreating(false)
    }
  }

  const handleRevokeKey = async (id: string) => {
    try {
      const res = await fetch(`/api/api-keys?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to revoke")
      await fetchKeys()
      toast.success("API key revoked")
    } catch {
      toast.error("Failed to revoke API key")
    }
  }

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key)
    toast.success("Copied to clipboard!")
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Key className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">API Keys</CardTitle>
        </div>
        <CardDescription>
          Create and manage API keys for programmatic access to your account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {newlyCreatedKey && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg space-y-2">
            <p className="text-sm font-medium text-green-800">
              \u26a0\ufe0f Save this key now \u2014 it won&apos;t be shown again!
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono bg-white border rounded px-2 py-1 break-all">
                {newlyCreatedKey}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopyKey(newlyCreatedKey)}
                aria-label="Copy API key"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setNewlyCreatedKey(null)}>
              Dismiss
            </Button>
          </div>
        )}

        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="key-name" className="sr-only">API Key Name</Label>
            <Input
              id="key-name"
              placeholder="Key name (e.g., Production, CI/CD)"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateKey()}
            />
          </div>
          <Button onClick={handleCreateKey} disabled={isCreating} aria-label="Create new API key">
            <Plus className="h-4 w-4 mr-2" />
            Create Key
          </Button>
        </div>

        <div className="space-y-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading keys...</p>
          ) : keys.length === 0 ? (
            <p className="text-sm text-muted-foreground">No API keys yet. Create one above.</p>
          ) : (
            keys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{key.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {key.keyPrefix}\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Created {new Date(key.createdAt).toLocaleDateString()}
                    {key.lastUsedAt && ` \u00b7 Last used ${new Date(key.lastUsedAt).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {key.expiresAt && (
                    <Badge variant="secondary" className="text-xs">
                      Expires {new Date(key.expiresAt).toLocaleDateString()}
                    </Badge>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleRevokeKey(key.id)}
                    aria-label={`Revoke API key: ${key.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
