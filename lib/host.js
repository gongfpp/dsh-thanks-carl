// src/core.mjs
var DEFAULTS = Object.freeze({
  enabled: true,
  completion: true,
  always: false,
  probability: 0.15,
  cooldown: 30,
  mode: "easter",
  quality: "patina",
  size: 100,
  sound: false,
  water: true,
  waterMinutes: 60,
  meals: true,
  mealTimes: ["12:00", "18:00"],
  rest: false,
  restMinutes: 120,
  dnd: true,
  dndStart: "00:00",
  dndEnd: "08:00",
  edge: "right",
  top: 0.48
});
var rejectedReasons = /* @__PURE__ */ new Set(["error", "aborted", "blocked", "max-tokens", "interrupted"]);
var CompletionTracker = class {
  constructor(publish, now = Date.now) {
    this.publish = publish;
    this.now = now;
    this.states = /* @__PURE__ */ new Map();
  }
  status(agent, status) {
    const id = agent?.session?.id;
    if (!id) return;
    let s = this.states.get(id);
    if (status === "running") {
      if (!s || s.agent !== agent || !s.running) s = { agent, running: true, starts: /* @__PURE__ */ new Set(), ends: /* @__PURE__ */ new Map() };
      this.states.set(id, s);
    } else if (status === "idle" && s?.agent === agent && s.running) {
      s.running = false;
      for (const [turn, kind] of s.ends) if (!rejectedReasons.has(kind)) this.publish({
        id: `${id}:${turn}`,
        sessionId: id,
        turn,
        kind,
        time: this.now()
      });
      this.states.delete(id);
    }
  }
  event(session, event) {
    const s = this.states.get(session?.id);
    if (!s?.running || s.agent.session !== session) return;
    const turn = event?.data?.turn;
    if (!Number.isSafeInteger(turn) || turn < 1) return;
    if (event.type === "turn/start") s.starts.add(turn);
    if (event.type === "turn/end" && s.starts.has(turn)) s.ends.set(turn, event.data.reason?.kind ?? "unknown");
  }
  dispose(agent) {
    if (this.states.get(agent?.session?.id)?.agent === agent) this.states.delete(agent.session.id);
  }
};

// src/host.mjs
var name = "thanks-carl";
var inject = ["connection", "agents"];
function apply(ctx) {
  let seq = 0;
  const events = [];
  const tracker = new CompletionTracker((event) => {
    events.push({ ...event, seq: ++seq });
    if (events.length > 100) events.shift();
  });
  ctx.on("agent/status", ({ agent, status }) => tracker.status(agent, status), { global: true });
  ctx.on("session/event", (session, event) => tracker.event(session, event), { global: true });
  ctx.on("agent/disposed", ({ agent }) => tracker.dispose(agent), { global: true });
  ctx.effect(() => ctx.connection.fetch.register({
    path: "/api/thanks-carl/status",
    methods: ["GET"],
    requestBody: "buffered",
    fetch: async (request) => {
      const url = new URL(request.url), sessionId = url.searchParams.get("sessionId");
      const since = Number(url.searchParams.get("since"));
      return Response.json({ seq, events: events.filter((e) => e.sessionId === sessionId && e.seq > since && Date.now() - e.time < 12e4) }, { headers: { "cache-control": "no-store" } });
    }
  }), "thanks-carl: authenticated lifecycle facts");
}
export {
  apply,
  inject,
  name
};
//# sourceMappingURL=host.js.map
