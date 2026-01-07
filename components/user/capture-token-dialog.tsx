"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type CaptureTokenItem = {
  id: string;
  label: string | null;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  const json: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof json === "object" && json !== null && "error" in json
        ? String((json as { error: unknown }).error)
        : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json as T;
}

export function CaptureTokenDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { open, onOpenChange } = props;
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [tokens, setTokens] = React.useState<CaptureTokenItem[]>([]);
  const [label, setLabel] = React.useState("");
  const [newToken, setNewToken] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson<{ tokens: CaptureTokenItem[] }>("/api/capture-tokens");
      setTokens(data.tokens);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  const onCreate = async () => {
    setLoading(true);
    setError(null);
    setNewToken(null);
    try {
      const data = await fetchJson<{ token: string }>("/api/capture-tokens", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          label: label.trim().length > 0 ? label.trim() : undefined,
          scopes: ["capture:bilibili"],
        }),
      });
      setNewToken(data.token);
      setLabel("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成失败");
    } finally {
      setLoading(false);
    }
  };

  const onRevoke = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await fetchJson<{ ok: true }>(`/api/capture-tokens/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "撤销失败");
    } finally {
      setLoading(false);
    }
  };

  const onCopy = async () => {
    if (!newToken) return;
    try {
      await navigator.clipboard.writeText(newToken);
    } catch {
      // Ignore; user can manually copy.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>采集 Token</DialogTitle>
          <DialogDescription>
            用于跨站点（如 Userscript）向 PineSnap 上传采集内容。Token 只会显示一次，请立即复制保存。
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : null}

        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="备注（可选，例如：我的电脑/Tampermonkey）"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              disabled={loading}
            />
            <Button onClick={onCreate} disabled={loading}>
              生成
            </Button>
          </div>

          {newToken ? (
            <div className="rounded-md border p-3 space-y-2">
              <div className="text-xs text-gray-600">新 Token（仅展示一次）</div>
              <div className="font-mono text-xs break-all">{newToken}</div>
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={onCopy}>
                  复制
                </Button>
              </div>
            </div>
          ) : null}

          <div className="rounded-md border">
            <div className="p-3 text-sm font-medium">已生成的 Token</div>
            <div className="divide-y">
              {tokens.length === 0 ? (
                <div className="p-3 text-sm text-gray-600">
                  {loading ? "加载中..." : "暂无"}
                </div>
              ) : (
                tokens.map((t) => (
                  <div key={t.id} className="p-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm truncate">
                        {t.label ?? "未命名"}
                        {t.revokedAt ? (
                          <span className="ml-2 text-xs text-gray-500">（已撤销）</span>
                        ) : null}
                      </div>
                      <div className="text-xs text-gray-600 break-all">
                        scopes: {t.scopes.join(", ")}
                      </div>
                      <div className="text-xs text-gray-500">
                        创建：{new Date(t.createdAt).toLocaleString()}
                        {t.lastUsedAt ? (
                          <> · 最近使用：{new Date(t.lastUsedAt).toLocaleString()}</>
                        ) : null}
                      </div>
                    </div>
                    {!t.revokedAt ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => onRevoke(t.id)}
                        disabled={loading}
                      >
                        撤销
                      </Button>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

