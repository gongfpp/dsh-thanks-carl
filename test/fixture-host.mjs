// TEST ONLY: a real DSH loop closed at pre-step, before any model request.
// Deliberately absent from exports / npm files / production bundle patch.
import { randomUUID } from 'node:crypto';
export const inject = ['agents','connection','sessionTitle','sessions'];
export async function apply(ctx) {
  if (process.env.CARL_FIXTURE !== '1' || !process.env.DSH_HOME?.includes('dsh-thanks-carl')) throw new Error('Fixture is restricted to this project isolated home.');
  const owned = new Map();
  let modelRequests = 0;
  ctx.on('llm/stream', () => { modelRequests++; throw new Error('NO MODELS: isolated Carl test forbids LLM requests'); }, {prepend:true,global:true});
  ctx.effect(() => () => Promise.all([...owned.values()].map(v=>v.handle.dispose())), 'fixture: release test loops');
  ctx.effect(() => ctx.connection.fetch.register({path:'/api/thanks-carl-fixture',methods:['POST','GET'],requestBody:'buffered',fetch:async request=>{
    if(request.method === 'GET') return Response.json({testOnly:true,modelRequests,sessions:[...owned.keys()]});
    const input=await request.json();
    if (input.action === 'create') {
      const sessionId=`carl-test-${randomUUID()}`, provider='openai-codex';
      const state={mode:'completed',handle:null};
      const handle=await ctx.agents.create({sessionId,agentOptions:{provider,model:'no-model-invoked'},meta:{cwd:process.env.CARL_TEST_WORKSPACE},setup(scope){
        scope.on('agent/pre-step',async ({signal})=>{
          if(state.mode==='error') throw new Error('Deterministic fixture failure; no model');
          if(state.mode==='blocked') return {kind:'reject'};
          if(state.mode==='waiting' || state.mode==='aborted') await new Promise((resolve,reject)=>{
            const timer=setTimeout(resolve,60_000); signal.addEventListener('abort',()=>{clearTimeout(timer);reject(signal.reason);},{once:true});
          });
          return {kind:'enter',messages:[]};
        });
      }});
      state.handle=handle; owned.set(sessionId,state);
      ctx.sessionTitle.rename(handle.agent.session,`隔离验收 · 卡尔 · ${sessionId.slice(-4)} · 无模型`);
      return Response.json({sessionId,provider,testOnly:true});
    }
    if (input.action === 'toggle-plugin') {
      const entry=[...ctx.loader.entries()].find(e=>e.options.id==='thanks-carl');
      if (!entry) return new Response('plugin entry not found',{status:404});
      await entry.update({disabled:input.enabled === false});
      return Response.json({ok:true,enabled:!entry.disabled});
    }
    const state=owned.get(input.sessionId); if(!state) return new Response('unknown test session',{status:404});
    if(input.action==='cancel'){state.handle.agent.cancel({kind:'user'});await state.handle.agent.whenIdle();return Response.json({ok:true,modelRequests});}
    if(input.action!=='run')return new Response('bad action',{status:400});
    state.mode=['completed','error','blocked','aborted','waiting'].includes(input.mode)?input.mode:'completed';
    state.handle.agent.followup({id:randomUUID(),role:'user',content:[{type:'text',text:'Local lifecycle verification. Pre-step consumes this without a model request.'}],source:{kind:'user'}});
    if(state.mode==='aborted')setTimeout(()=>state.handle.agent.cancel({kind:'user'}),100);
    if(state.mode==='waiting')return Response.json({ok:true,running:true,modelRequests});
    await state.handle.agent.whenIdle(); await ctx.sessions.flush(state.handle.agent.session);
    return Response.json({ok:true,modelRequests,status:state.handle.agent.status});
  }}),'fixture: authenticated test controls');
}
