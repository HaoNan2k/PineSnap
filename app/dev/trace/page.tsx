import { notFound } from "next/navigation";
import Link from "next/link";
import { getLearnTraceRounds } from "@/lib/dev/trace-store";
import { CopyButton } from "@/app/dev/trace/copy-button";

export const dynamic = "force-dynamic";

const isDev = process.env.NODE_ENV !== "production";

const formatJson = (value: unknown) =>
  value === undefined ? "undefined" : JSON.stringify(value, null, 2);

const formatTime = (value?: string) => value ?? "pending";

type DevTracePageProps = {
  // Next.js 16 may pass this as a Promise in server components.
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getQueryParam(
  sp: Record<string, string | string[] | undefined> | undefined,
  key: string
): string | undefined {
  const value = sp?.[key];
  if (typeof value === "string") return value.trim() || undefined;
  if (Array.isArray(value)) return value[0]?.trim() || undefined;
  return undefined;
}

function buildHref(params: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) sp.set(key, value);
  }
  const query = sp.toString();
  return query ? `/dev/trace?${query}` : "/dev/trace";
}

export default async function DevTracePage({ searchParams }: DevTracePageProps) {
  if (!isDev) {
    notFound();
  }

  const rounds = getLearnTraceRounds();
  const unwrappedSearchParams = await searchParams;
  const learningId = getQueryParam(unwrappedSearchParams, "learningId");
  const clientMessageId = getQueryParam(unwrappedSearchParams, "clientMessageId");

  const filteredRounds = rounds.filter((r) => {
    if (learningId && r.learningId !== learningId) return false;
    if (clientMessageId && r.clientMessageId !== clientMessageId) return false;
    return true;
  });

  const selectedRound =
    clientMessageId && learningId
      ? rounds.find(
          (r) => r.clientMessageId === clientMessageId && r.learningId === learningId
        )
      : clientMessageId
        ? rounds.find((r) => r.clientMessageId === clientMessageId)
        : undefined;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Learn Trace</h1>
        <p className="text-sm text-muted-foreground">
          Dev-only trace view. Refresh the page to update.
        </p>
      </header>

      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            Total: <span className="font-medium text-foreground">{rounds.length}</span>
            {learningId ? (
              <>
                {" "}
                · Filter learningId:{" "}
                <span className="font-mono text-foreground">{learningId}</span>
              </>
            ) : null}
            {clientMessageId ? (
              <>
                {" "}
                · Selected clientMessageId:{" "}
                <span className="font-mono text-foreground">{clientMessageId}</span>
              </>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dev/trace"
              className="rounded-md border bg-background px-2 py-1 text-xs hover:bg-muted"
            >
              Clear
            </Link>
            {selectedRound ? (
              <CopyButton
                label="Copy Full Context"
                text={formatJson({
                  id: selectedRound.id,
                  startedAt: selectedRound.startedAt,
                  finishedAt: selectedRound.finishedAt,
                  error: selectedRound.error,
                  conversationId: selectedRound.conversationId,
                  learningId: selectedRound.learningId,
                  clientMessageId: selectedRound.clientMessageId,
                  inputParts: selectedRound.inputParts,
                  requestMessages: selectedRound.requestMessages,
                  responseMessages: selectedRound.responseMessages,
                })}
              />
            ) : null}
          </div>
        </div>

        <form method="get" className="mt-3 flex flex-wrap items-end gap-3">
          <label className="grid gap-1">
            <span className="text-xs text-muted-foreground">learningId</span>
            <input
              name="learningId"
              defaultValue={learningId ?? ""}
              placeholder="uuid"
              className="w-[26rem] max-w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-muted-foreground">clientMessageId</span>
            <input
              name="clientMessageId"
              defaultValue={clientMessageId ?? ""}
              placeholder="string"
              className="w-[18rem] max-w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            className="rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted"
          >
            Search
          </button>
        </form>
      </section>

      {selectedRound ? (
        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-medium">Selected Round Context</div>
            <div className="text-xs text-muted-foreground">
              roundId: <span className="font-mono">{selectedRound.id}</span>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>
              <span className="font-medium text-foreground">Start:</span>{" "}
              {formatTime(selectedRound.startedAt)}
            </span>
            <span>
              <span className="font-medium text-foreground">Finish:</span>{" "}
              {formatTime(selectedRound.finishedAt)}
            </span>
            <span>
              <span className="font-medium text-foreground">Messages:</span> req{" "}
              {selectedRound.requestMessages.length} / res{" "}
              {selectedRound.responseMessages?.length ?? 0}
            </span>
          </div>

          <div className="mt-3 text-xs text-muted-foreground">
            <div>
              conversationId:{" "}
              <span className="font-mono text-foreground">
                {selectedRound.conversationId}
              </span>
            </div>
            <div>
              learningId:{" "}
              <span className="font-mono text-foreground">
                {selectedRound.learningId}
              </span>
            </div>
            <div>
              clientMessageId:{" "}
              <span className="font-mono text-foreground">
                {selectedRound.clientMessageId}
              </span>
            </div>
          </div>

          {selectedRound.error ? (
            <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {selectedRound.error}
            </div>
          ) : null}

          <div className="mt-4 space-y-4">
            <details open>
              <summary className="cursor-pointer text-sm font-medium">
                Request Messages (to model)
              </summary>
              <div className="mt-2 flex items-center justify-end">
                <CopyButton text={formatJson(selectedRound.requestMessages)} />
              </div>
              <pre className="mt-2 overflow-auto rounded-lg bg-muted p-3 text-xs">
                {formatJson(selectedRound.requestMessages)}
              </pre>
            </details>

            <details open>
              <summary className="cursor-pointer text-sm font-medium">
                Response Messages (from model)
              </summary>
              <div className="mt-2 flex items-center justify-end">
                <CopyButton text={formatJson(selectedRound.responseMessages)} />
              </div>
              <pre className="mt-2 overflow-auto rounded-lg bg-muted p-3 text-xs">
                {formatJson(selectedRound.responseMessages)}
              </pre>
            </details>

            <details>
              <summary className="cursor-pointer text-sm font-medium">
                Client Input Parts
              </summary>
              <div className="mt-2 flex items-center justify-end">
                <CopyButton text={formatJson(selectedRound.inputParts)} />
              </div>
              <pre className="mt-2 overflow-auto rounded-lg bg-muted p-3 text-xs">
                {formatJson(selectedRound.inputParts)}
              </pre>
            </details>
          </div>
        </section>
      ) : clientMessageId ? (
        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="text-sm">
            No round found for{" "}
            <span className="font-mono">{clientMessageId}</span>
            {learningId ? (
              <>
                {" "}
                under learningId <span className="font-mono">{learningId}</span>
              </>
            ) : null}
            .
          </div>
        </section>
      ) : null}

      {filteredRounds.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          No rounds.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredRounds.map((round) => (
            <section
              key={round.id}
              className="rounded-xl border bg-card p-4 shadow-sm"
            >
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span>
                  <span className="font-medium text-foreground">Start:</span>{" "}
                  {formatTime(round.startedAt)}
                </span>
                <span>
                  <span className="font-medium text-foreground">Finish:</span>{" "}
                  {formatTime(round.finishedAt)}
                </span>
                <span>
                  <span className="font-medium text-foreground">Messages:</span>{" "}
                  req {round.requestMessages.length} / res{" "}
                  {round.responseMessages?.length ?? 0}
                </span>
              </div>

              <div className="mt-3 text-xs text-muted-foreground">
                <div>conversationId: {round.conversationId}</div>
                <div>learningId: {round.learningId}</div>
                <div className="flex flex-wrap items-center gap-2">
                  <span>clientMessageId:</span>
                  <Link
                    href={buildHref({
                      learningId: learningId ?? round.learningId,
                      clientMessageId: round.clientMessageId,
                    })}
                    className="font-mono text-foreground underline underline-offset-4 hover:text-foreground/80"
                  >
                    {round.clientMessageId}
                  </Link>
                  <CopyButton
                    label="Copy Id"
                    text={round.clientMessageId}
                    className="inline-flex items-center rounded-md border bg-background px-2 py-1 text-xs hover:bg-muted"
                  />
                </div>
              </div>

              {round.error ? (
                <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {round.error}
                </div>
              ) : null}

              <div className="mt-4 space-y-4">
                <details>
                  <summary className="cursor-pointer text-sm font-medium">
                    Request Messages (to model)
                  </summary>
                  <div className="mt-2 flex items-center justify-end">
                    <CopyButton text={formatJson(round.requestMessages)} />
                  </div>
                  <pre className="mt-2 overflow-auto rounded-lg bg-muted p-3 text-xs">
                    {formatJson(round.requestMessages)}
                  </pre>
                </details>

                <details>
                  <summary className="cursor-pointer text-sm font-medium">
                    Response Messages (from model)
                  </summary>
                  <div className="mt-2 flex items-center justify-end">
                    <CopyButton text={formatJson(round.responseMessages)} />
                  </div>
                  <pre className="mt-2 overflow-auto rounded-lg bg-muted p-3 text-xs">
                    {formatJson(round.responseMessages)}
                  </pre>
                </details>

                <details>
                  <summary className="cursor-pointer text-sm font-medium">
                    Client Input Parts
                  </summary>
                  <div className="mt-2 flex items-center justify-end">
                    <CopyButton text={formatJson(round.inputParts)} />
                  </div>
                  <pre className="mt-2 overflow-auto rounded-lg bg-muted p-3 text-xs">
                    {formatJson(round.inputParts)}
                  </pre>
                </details>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
