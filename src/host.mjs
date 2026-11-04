import { CompletionTracker } from './core.mjs';
export const name = 'thanks-carl';
export const inject = ['connection', 'agents'];
// No chat text or credentials leave the Host. This authenticated endpoint returns
// just bounded lifecycle facts for the one session the page already displays.
export function apply(ctx) {
  let seq = 0;
  const events = [];
  const tracker = new CompletionTracker(event => {
    events.push({ ...event, seq:++seq });
    if (events.length > 100) events.shift();
  });
  ctx.on('agent/status', ({agent,status}) => tracker.status(agent,status), {global:true});
  ctx.on('session/event', (session,event) => tracker.event(session,event), {global:true});
  ctx.on('agent/disposed', ({agent}) => tracker.dispose(agent), {global:true});
  ctx.effect(() => ctx.connection.fetch.register({
    path:'/api/thanks-carl/status', methods:['GET'], requestBody:'buffered',
    fetch:async request => {
      const url = new URL(request.url), sessionId = url.searchParams.get('sessionId');
      const since = Number(url.searchParams.get('since'));
      return Response.json({ seq, events:events.filter(e => e.sessionId === sessionId && e.seq > since && Date.now()-e.time < 120_000) }, {headers:{'cache-control':'no-store'}});
    },
  }), 'thanks-carl: authenticated lifecycle facts');
}
