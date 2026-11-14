import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { LOCALES } from "@/i18n/config";
import { ipFrom, isBotRequest } from "@/lib/analytics";
import { assistantDailyLimit, assistantEnabled, assistantModel, contextNote, runTool, systemPrompt, TOOLS } from "@/lib/assistant";
import { dubaiToday } from "@/lib/permits";
import { DAY, hit, MINUTE, take } from "@/lib/throttle";

// The AI assistant's chat endpoint (src/components/AssistantWidget.tsx). The visitor's conversation comes in as plain
// text turns; the answer streams back as newline-separated JSON events (AssistantEvent) while the model searches the
// advertised listings with its tools (src/lib/assistant.ts).

export const maxDuration = 60;

type MessageParam = Anthropic.Beta.Messages.BetaMessageParam;
type ContentBlock = Anthropic.Beta.Messages.BetaContentBlock;
type ContentBlockParam = Anthropic.Beta.Messages.BetaContentBlockParam;
type ToolUseBlock = Anthropic.Beta.Messages.BetaToolUseBlock;
type ToolResultBlockParam = Anthropic.Beta.Messages.BetaToolResultBlockParam;

export type AssistantEvent =
  | { t: "text"; v: string }
  /** Drop the answer streamed so far (a refusal: the partial answer is not to be kept). */
  | { t: "reset" }
  | { t: "error"; code: "failed" | "busy" | "refusal" }
  | { t: "done" };

/** Tool rounds per answer, output tokens per round (thinking included) and the turns of history kept: the cost caps. */
const MAX_ROUNDS = 4;
const MAX_TOKENS = 2048;
const KEEP_TURNS = 12;
const MAX_USER_CHARS = 1000;
const MAX_BODY = 40_000;

const Body = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(4000) }))
    .min(1)
    .max(60),
  locale: z.enum(LOCALES),
  path: z.string().max(300).optional(),
});

let client: Anthropic | undefined;

/** Same site only: not another site using the endpoint as a free chatbot. */
function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * The assistant turn to send back with the tool results. After a refusal handed the answer to a fallback model midway,
 * only the text from before the last `fallback` marker goes back (the API's rule for echoing a fallback turn).
 */
function echoable(content: ContentBlock[]): ContentBlockParam[] {
  const boundary = content.findLastIndex((b) => b.type === "fallback");
  const kept = boundary < 0 ? content : content.filter((b, i) => i > boundary || b.type === "text");
  return kept as ContentBlockParam[];
}

const fail = (error: string, status: number) => Response.json({ error }, { status });

export async function POST(req: Request) {
  if (!assistantEnabled()) return fail("off", 503);
  if (!sameOrigin(req) || isBotRequest(req.headers)) return fail("forbidden", 403);

  const raw = await req.text();
  if (raw.length > MAX_BODY) return fail("too_large", 413);
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(JSON.parse(raw));
  } catch {
    return fail("bad_request", 400);
  }

  // The last turns, starting with the visitor's; neighbours from the same side merged (the API wants them alternating).
  const turns: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of body.messages.slice(-KEEP_TURNS)) {
    if (!turns.length && m.role !== "user") continue;
    const last = turns.at(-1);
    if (last?.role === m.role) last.content += `\n\n${m.content}`;
    else turns.push({ ...m });
  }
  const latest = turns.at(-1);
  if (!latest || latest.role !== "user" || body.messages.at(-1)!.content.length > MAX_USER_CHARS) return fail("bad_request", 400);

  // Per visitor: a burst and a day; and a ceiling for everyone together, which caps the day's spend. The day's
  // allowances count only the messages they let through (take): refused ones, counted in the rolling day, would keep
  // them closed for good while demand stayed above them. The visitor's own limits come first, so a visitor refused by
  // them uses none of everyone's, and one refused by the ceiling gets their own day's message back.
  const ip = ipFrom(req.headers);
  if (!(await hit(`assistant:${ip}`, 15, 10 * MINUTE))) return fail("busy", 429);
  const visitorDay = await take(`assistant-day:${ip}`, 80, DAY);
  if (!visitorDay) return fail("busy", 429);
  if (!(await take("assistant:all", assistantDailyLimit(), DAY))) {
    await visitorDay();
    return fail("busy", 429);
  }

  const locale = body.locale;
  // The page goes into the instructions, so only a plain site path (no query, no free text) is taken.
  const path = body.path && /^\/(?!\/)[\w\-./%]{0,200}$/.test(body.path) ? body.path : undefined;
  const model = assistantModel();
  client ??= new Anthropic();
  const api = client;
  // The static instructions are cached across visitors; the date, language and page follow them.
  const system: Anthropic.Beta.Messages.BetaTextBlockParam[] = [
    { type: "text", text: systemPrompt(), cache_control: { type: "ephemeral" } },
    { type: "text", text: contextNote(locale, path, dubaiToday()) },
  ];
  // A declined answer is re-run on Anthropic's recommended fallback model; Haiku has no server-side fallback.
  const fallback = /haiku/i.test(model) ? {} : { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const };
  const messages: MessageParam[] = turns;
  const abort = new AbortController();
  req.signal.addEventListener("abort", () => abort.abort());

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true;
      const send = (e: AssistantEvent) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(e)}\n`));
        } catch {
          open = false;
        }
      };
      const usage = { rounds: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, served: model };
      let wrote = false;
      try {
        for (let round = 0; ; round++) {
          if (round === MAX_ROUNDS) {
            send({ t: "error", code: "failed" });
            break;
          }
          const s = api.beta.messages.stream(
            {
              model,
              max_tokens: MAX_TOKENS,
              system,
              tools: TOOLS,
              messages,
              output_config: { effort: "low" },
              cache_control: { type: "ephemeral" },
              ...fallback,
            },
            { signal: abort.signal },
          );
          let roundText = "";
          s.on("text", (delta) => {
            // A blank line between what the model said before a search and what it says after.
            if (!roundText && wrote) send({ t: "text", v: "\n\n" });
            roundText += delta;
            send({ t: "text", v: delta });
          });
          const msg = await s.finalMessage();
          usage.rounds++;
          usage.input += msg.usage.input_tokens;
          usage.output += msg.usage.output_tokens;
          usage.cacheRead += msg.usage.cache_read_input_tokens ?? 0;
          usage.cacheWrite += msg.usage.cache_creation_input_tokens ?? 0;
          usage.served = msg.model;
          if (roundText) wrote = true;

          if (msg.stop_reason === "refusal") {
            send({ t: "reset" });
            send({ t: "error", code: "refusal" });
            break;
          }
          if (msg.stop_reason === "max_tokens") {
            send({ t: "text", v: "…" });
            break;
          }
          if (msg.stop_reason !== "tool_use") break;

          const content = echoable(msg.content);
          const calls = content.filter((b): b is ToolUseBlock => b.type === "tool_use");
          if (!calls.length) break;
          messages.push({ role: "assistant", content });
          const results: ToolResultBlockParam[] = await Promise.all(
            calls.map(async (call) => {
              const r = await runTool(call.name, call.input, locale);
              return { type: "tool_result" as const, tool_use_id: call.id, content: r.content, ...(r.isError ? { is_error: true } : {}) };
            }),
          );
          messages.push({ role: "user", content: results });
        }
      } catch (err) {
        if (!abort.signal.aborted) {
          console.error("assistant failed", err);
          const busy = err instanceof Anthropic.RateLimitError || (err instanceof Anthropic.APIError && err.status === 529);
          send({ t: "error", code: busy ? "busy" : "failed" });
        }
      } finally {
        // One line per answer in the logs: what it cost (tokens) and which model served it.
        console.info(JSON.stringify({ assistant: usage }));
        send({ t: "done" });
        open = false;
        try {
          controller.close();
        } catch {}
      }
    },
    cancel() {
      abort.abort();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
  });
}
