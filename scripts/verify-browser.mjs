import { chromium } from 'playwright';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
const logBytes = await readFile('.runtime/host.log'); const log = logBytes[0] === 255 && logBytes[1] === 254 ? logBytes.toString('utf16le') : logBytes.toString('utf8');
const auth = [...log.matchAll(/http:\/\/127\.0\.0\.1:3345\/\?token=[A-Za-z0-9_-]+/g)].at(-1)?.[0];
if(!auth) throw new Error('Start run-isolated.ps1 -Fixture and save stdout to .runtime/host.log first.');
const browser = await chromium.launch({headless:true,executablePath:process.env.CARL_BROWSER ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const context=await browser.newContext({viewport:{width:1440,height:960},locale:'zh-CN',timezoneId:'Asia/Shanghai',reducedMotion:'reduce'});
const errors=[], requests=[],results={started:new Date().toISOString(),url:'http://127.0.0.1:3345/',tests:[],screenshots:[],modelRequests:null};
context.on('page',p=>{p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(r.url().includes('/api/'))requests.push({url:new URL(r.url()).pathname,method:r.method()});});});
await context.route('**/*',route=>{const url=new URL(route.request().url());return url.hostname === '127.0.0.1' || url.protocol === 'data:' || url.protocol === 'blob:' ? route.continue() : route.abort();});
await mkdir('artifacts/screenshots',{recursive:true});
const page=await context.newPage();
await page.addLocatorHandler(page.getByRole('dialog',{name:'开始使用'}),async dialog => {await dialog.getByRole('button',{name:'关闭',exact:true}).click();});
const fixture = async input=>{const response=await page.request.post('http://127.0.0.1:3345/api/thanks-carl-fixture',{data:input,maxRetries:input.action === 'cancel' ? 1 : 0});assert.equal(response.status(),200,`Fixture HTTP ${response.status()} ${await response.text()}`);return response.json();};
const rpc = async(method,request)=>page.evaluate(async({method,request})=>{const rpcId=crypto.randomUUID();const r=await fetch(`/api/${method}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({type:'client-request',rpcId,method,payload:{args:{request}}})});const j=await r.json();if(!j.result.ok)throw Error(JSON.stringify(j.result.error));return j.result.value;},{method,request});
const save = async name=>{await page.screenshot({path:`artifacts/screenshots/${name}.png`});results.screenshots.push(`${name}.png`);};
const overlay = page.locator('[data-thanks-carl="overlay"]');
const dismiss=async()=>{await closeOnboarding();if(await overlay.count())await overlay.getByRole('button',{name:'关闭卡尔',exact:true}).click();};
async function closeOnboarding(){const dialog=page.getByRole('dialog',{name:'开始使用'});if(await dialog.count()){await dialog.getByRole('button',{name:'关闭',exact:true}).evaluate(e=>e.click());await dialog.waitFor({state:'hidden'});}}
async function settings(){await closeOnboarding();await page.getByRole('button',{name:'插件',exact:true}).click();const card=page.getByRole('button',{name:'查看 谢谢卡尔',exact:true});await card.waitFor({timeout:20000});await closeOnboarding();await card.click();await page.locator('[data-plugin-config] [data-thanks-carl="settings"]').waitFor();}
async function closeSettings(){await page.getByRole('button',{name:'新建会话',exact:true}).last().click();await page.locator('[data-thanks-carl="settings"]').waitFor({state:'hidden'});await closeOnboarding();}
try {
  await page.clock.install();
  await page.goto(auth);results.release=await page.evaluate(()=>window.__DSH_BOOT__.release);await page.getByRole('button',{name:'账号菜单',exact:true}).waitFor();await closeOnboarding();
  assert.equal((await page.request.get('http://127.0.0.1:3345/api/thanks-carl/status')).status(),200);results.tests.push(`Native authenticated Host and client booted on ${results.release.version ?? JSON.stringify(results.release)}`);
  const anonymous=await browser.newContext();assert.equal((await anonymous.request.get('http://127.0.0.1:3345/api/thanks-carl/status')).status(),401);await anonymous.close();results.tests.push('Anonymous lifecycle API refused with 401');
  await settings();
  const controls=page.locator('[data-thanks-carl="settings"]');
  assert.equal(await controls.locator('.tc-image-row img').evaluate(e=>e.naturalWidth),72,'Packaged Carl image is ready without user upload');
  results.tests.push('Built-in Carl meme image is visible immediately; no upload required');
  await page.locator('[data-thanks-carl="settings"] input[type=file]').setInputFiles(resolve('.local-assets/carl-clear.png'));
  await page.waitForFunction(()=>localStorage.getItem('thanks-carl.images.v1'));
  await controls.getByLabel('任务完成必出现',{exact:true}).check();await controls.getByLabel('勿扰时段',{exact:true}).uncheck();
  await controls.locator('h2').scrollIntoViewIfNeeded();await save('01-native-settings');
  await controls.getByRole('button',{name:'召唤卡尔',exact:true}).click();await overlay.waitFor();await closeSettings();await save('02-real-carl-patina');
  assert.equal(await overlay.locator('img').evaluate(e=>e.naturalWidth),72);results.tests.push('Local original-photo import, 72px patina and native settings work');
  await dismiss();await settings();await controls.getByLabel('画质',{exact:true}).selectOption('clear');await controls.getByRole('button',{name:'召唤卡尔',exact:true}).click();await closeSettings();await save('03-same-photo-clear');assert.equal(await overlay.locator('img').evaluate(e=>e.naturalWidth),384);await dismiss();
  // Create an actual loop owned ONLY by the isolated fixture. Pre-step returns
  // zero messages so the real driver writes completed, without an LLM stream.
  const carl=await fixture({action:'create'});await fixture({action:'run',sessionId:carl.sessionId,mode:'completed'});
  const carlTitle=`验收 Carl ${carl.sessionId.slice(-4)} · 无模型`;
  await rpc('session/rename',{sessionId:carl.sessionId,title:carlTitle});
  const group=page.getByText('未分组',{exact:true});if(await group.count())await group.click();
  await page.getByText(carlTitle,{exact:true}).first().click();
  await page.waitForResponse(r=>r.url().includes(`/api/thanks-carl/status?sessionId=${carl.sessionId}`) && r.status()===200);
  await page.waitForTimeout(5500);await fixture({action:'run',sessionId:carl.sessionId,mode:'completed'});
  await overlay.locator('[data-event-kind=completion]').waitFor({timeout:12000});assert.match(await overlay.innerText(),/这一轮完成/);assert.match(await overlay.innerText(),/谢谢卡尔/);await save('04-real-driver-completion');
  // Composer remains usable and overlay only occupies its own tiny hit targets.
  const editor=page.locator('[contenteditable=true]').first();if(await editor.count()){const a=await editor.boundingBox(),b=await overlay.boundingBox();assert.ok(a&&b);assert.ok(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y,'Overlay must not overlap composer');await editor.fill('输入未被拦截（不发送）');assert.match(await editor.innerText(),/输入未被拦截/);await editor.fill('');}
  await dismiss();
  for(const mode of ['error','aborted','blocked']){await fixture({action:'run',sessionId:carl.sessionId,mode});await page.waitForTimeout(5500);assert.equal(await overlay.count(),0,mode+' must not celebrate');}
  await fixture({action:'run',sessionId:carl.sessionId,mode:'waiting'});await page.waitForTimeout(5500);assert.equal(await overlay.count(),0);await fixture({action:'cancel',sessionId:carl.sessionId});results.tests.push('Actual native driver completion once; error/cancel/blocked/waiting never congratulated; composer hit test passed');
  await page.reload();await page.getByRole('button',{name:'账号菜单',exact:true}).waitFor();await closeOnboarding();await page.waitForTimeout(5500);assert.equal(await overlay.count(),0);assert.ok(await page.evaluate(()=>JSON.parse(localStorage.getItem('thanks-carl.config.v1')).always));results.tests.push('Refresh retains config/image/ledger and does not replay old completion');
  // Browser clock controls drive the REAL local scheduler; no fake screenshot DOM.
  await page.clock.setSystemTime(new Date('2026-11-01T11:59:00+08:00'));
  await settings();await controls.getByLabel('喝水提醒',{exact:true}).check();await controls.getByLabel('每隔多少分钟',{exact:true}).fill('1');await controls.getByLabel('吃饭提醒',{exact:true}).uncheck();await closeSettings();
  await page.waitForFunction(()=>{const l=JSON.parse(localStorage.getItem('thanks-carl.ledger.v1'));return Math.abs(Date.now()-l?.schedule?.anchors?.water)<5000;});
  await page.clock.fastForward(60_100);await overlay.locator('[data-event-kind=water]').waitFor();await closeOnboarding();assert.match(await overlay.innerText(),/谢谢谢谢卡尔/);await save('05-scheduled-water');await overlay.getByRole('button',{name:'稍后 10 分钟',exact:true}).click();await overlay.waitFor({state:'hidden'});
  await settings();await controls.getByLabel('喝水提醒',{exact:true}).uncheck();await controls.getByLabel('吃饭提醒',{exact:true}).check();await controls.getByLabel('吃饭时刻',{exact:true}).fill('12:01');await controls.getByLabel('吃饭时刻',{exact:true}).press('Tab');await closeSettings();await page.clock.fastForward(60_000);await overlay.locator('[data-event-kind=meal]').waitFor();await save('06-scheduled-meal');await dismiss();results.tests.push('Real local timer under controlled browser clock: water deadline, snooze, meal wall-clock deadline');
  // Persist a due interval; two real pages contend using native Web Locks.
  await page.evaluate(()=>{const c=JSON.parse(localStorage.getItem('thanks-carl.config.v1'));Object.assign(c,{water:true,waterMinutes:1,meals:false,dnd:false});localStorage.setItem('thanks-carl.config.v1',JSON.stringify(c));const now=Date.now();localStorage.setItem('thanks-carl.ledger.v1',JSON.stringify({seen:{},schedule:{zone:'Asia/Shanghai',last:now,anchors:{water:now-60_000,rest:now},consumed:{},snooze:null}}));});
  const tab=await context.newPage();await tab.clock.install({time:new Date(await page.evaluate(()=>Date.now()))});await tab.goto('http://127.0.0.1:3345/');await tab.getByRole('button',{name:'账号菜单',exact:true}).waitFor();await page.clock.fastForward(5000);await tab.clock.fastForward(5000);const count=await page.locator('[data-event-kind=water]').count()+await tab.locator('[data-event-kind=water]').count();assert.equal(count,1,'Two real tabs show a single shared reminder');await tab.close();results.tests.push('Two native browser tabs share Web Locks and display one due reminder');
  await dismiss();
  // Headless reduced-motion geometry is real CSS, not a conceptual mock.
  await settings();await controls.getByRole('button',{name:'召唤卡尔',exact:true}).click();await closeSettings();assert.equal(await overlay.evaluate(e=>getComputedStyle(e).animationName),'none');
  const pet=overlay.getByRole('button',{name:'卡尔：拖动停靠，点按互动',exact:true});const rect=await pet.boundingBox();await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);await page.mouse.down();await page.mouse.move(40,250,{steps:10});await page.mouse.up();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('thanks-carl.config.v1')).edge),'left');await save('07-dragged-left');results.tests.push('Reduced motion and pointer drag to left edge work');
  await dismiss();await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'召唤卡尔，打开快捷菜单',exact:true}).click();await overlay.getByRole('dialog',{name:'卡尔快捷菜单'}).waitFor();const narrow=await overlay.boundingBox();assert.ok(narrow.x>=0&&narrow.x+narrow.width<=390);await save('08-mobile');await page.keyboard.press('Escape');
  // New companion controls run on the same real shell.overlay and native storage.
  await page.setViewportSize({width:1440,height:960});await settings();
  await controls.getByLabel('模式',{exact:true}).selectOption('resident');await controls.getByLabel('喝水提醒',{exact:true}).uncheck();await controls.getByLabel('吃饭提醒',{exact:true}).uncheck();await closeSettings();
  const companion=overlay.getByRole('button',{name:'卡尔：拖动停靠，点按互动',exact:true});
  assert.equal(await overlay.evaluate(e=>e.scrollWidth<=e.clientWidth && getComputedStyle(e).overflowX==='visible' && getComputedStyle(e).overflowY==='visible'),true,'Resident pet must not create a horizontal scrollbar');await save('09-resident-no-scrollbar');
  await companion.click();const firstLine=await overlay.locator('[data-event-kind=pet] p').innerText();await companion.press('Enter');assert.notEqual(await overlay.locator('[data-event-kind=pet] p').innerText(),firstLine);
  await companion.click();await companion.click();assert.match(await overlay.locator('[data-event-kind=pet]').innerText(),/有点痒/);assert.ok(await companion.evaluate(e=>e.classList.contains('tc-shy')));await save('09-pet-shy');
  await page.clock.fastForward(3000);await companion.click({button:'right'});const menu=overlay.getByRole('dialog',{name:'卡尔快捷菜单'});await menu.waitFor();await save('10-companion-menu');
  await page.keyboard.press('Escape');await menu.waitFor({state:'hidden'});assert.equal(await overlay.getByRole('button',{name:'卡尔菜单',exact:true}).evaluate(e=>e===document.activeElement),true);
  await overlay.getByRole('button',{name:'卡尔菜单',exact:true}).click();await menu.getByRole('button',{name:'专注 25 分钟',exact:true}).click();
  const chip=overlay.locator('.tc-focus-chip');await chip.waitFor();assert.match(await chip.innerText(),/25:00/);
  await page.clock.fastForward(60_000);assert.match(await chip.innerText(),/24:00/);await chip.getByRole('button',{name:'暂停专注',exact:true}).click();await page.locator('[data-focus-status=paused]').waitFor();
  const pausedTime=await chip.innerText();await page.clock.fastForward(120_000);assert.equal(await chip.innerText(),pausedTime);await page.reload();await page.getByRole('button',{name:'账号菜单',exact:true}).waitFor();await closeOnboarding();
  await page.locator('[data-focus-status=paused]').waitFor();assert.match(await chip.innerText(),/24:00/);await chip.getByRole('button',{name:'继续专注',exact:true}).click();await page.locator('[data-focus-status=running]').waitFor();await page.clock.fastForward(24*60_000+5100);
  await overlay.locator('[data-event-kind=focus]').waitFor();assert.match(await overlay.innerText(),/一起专注了 25 分钟/);assert.equal(await chip.getAttribute('data-focus-status'),'finished');await save('11-focus-finished');await chip.getByRole('button',{name:'结束专注',exact:true}).click();
  results.tests.push('Mouse/keyboard pet responses, repeated-pat shy cooldown, right-click menu and Escape focus; 25-minute focus pause/resume/reload/finish');
  await overlay.getByRole('button',{name:'卡尔菜单',exact:true}).click();await menu.getByRole('button',{name:'专注 45 分钟',exact:true}).click();await chip.waitFor();
  const companionTab=await context.newPage();await companionTab.addLocatorHandler(companionTab.getByRole('dialog',{name:'开始使用'}),async dialog => {await dialog.getByRole('button',{name:'关闭',exact:true}).click();});await companionTab.clock.install({time:new Date(await page.evaluate(()=>Date.now()))});await companionTab.goto('http://127.0.0.1:3345/');await companionTab.getByRole('button',{name:'账号菜单',exact:true}).waitFor();
  await companionTab.locator('[data-focus-status=running]').waitFor();await companionTab.getByRole('button',{name:'暂停专注',exact:true}).click();await page.locator('[data-focus-status=paused]').waitFor();assert.ok(await page.evaluate(()=>JSON.parse(localStorage.getItem('thanks-carl.ledger.v1')).focus.remaining > 44*60_000));await companionTab.getByRole('button',{name:'结束专注',exact:true}).click();await chip.waitFor({state:'hidden'});await companionTab.close();
  await overlay.getByRole('button',{name:'卡尔菜单',exact:true}).click();await menu.getByRole('button',{name:'我喝过水了',exact:true}).click();const acknowledged=await page.evaluate(()=>JSON.parse(localStorage.getItem('thanks-carl.ledger.v1')).schedule.anchors.water);assert.ok(Math.abs(acknowledged-await page.evaluate(()=>Date.now()))<5000);
  await menu.getByRole('button',{name:'安静一小时',exact:true}).click();await menu.getByRole('button',{name:/唤醒卡尔/}).waitFor();await save('12-quiet-shortcut');await page.keyboard.press('Escape');await page.clock.fastForward(60*60_000+1000);await overlay.getByRole('button',{name:'卡尔菜单',exact:true}).click();await menu.getByRole('button',{name:'今天先休息',exact:true}).waitFor();
  await menu.getByRole('button',{name:'今天先休息',exact:true}).click();await menu.getByRole('button',{name:/唤醒卡尔/}).waitFor();const quietUntil=await page.evaluate(()=>JSON.parse(localStorage.getItem('thanks-carl.ledger.v1')).quietUntil);assert.equal(new Date(quietUntil).getUTCHours(),16);await menu.getByRole('button',{name:/唤醒卡尔/}).click();
  results.tests.push('45-minute focus shared across real tabs, remote pause/end; water acknowledgment, one-hour quiet expiry and local-midnight quiet/wake');
  await page.setViewportSize({width:390,height:600});await save('13-mobile-menu');const mobileMenu=await menu.boundingBox();assert.ok(mobileMenu.x>=0 && mobileMenu.y>=0 && mobileMenu.x+mobileMenu.width<=390 && mobileMenu.y+mobileMenu.height<=600);await page.keyboard.press('Escape');assert.equal(await overlay.evaluate(e=>e.scrollWidth<=e.clientWidth && getComputedStyle(e).overflowY==='visible'),true,'Mobile pet must not create a horizontal scrollbar');
  const mobilePet=await companion.boundingBox();await page.mouse.move(mobilePet.x+mobilePet.width/2,mobilePet.y+mobilePet.height/2);await page.mouse.down();await page.clock.fastForward(650);await page.mouse.up();await menu.waitFor();await page.keyboard.press('Escape');await overlay.getByRole('button',{name:'卡尔菜单',exact:true}).click();await menu.getByRole('button',{name:'收起卡尔',exact:true}).click();await page.getByRole('button',{name:'召唤卡尔，打开快捷菜单',exact:true}).click();await menu.waitFor();
  results.tests.push('390x600 menu stays onscreen; long press and collapsed launcher reopen menu');
  await fixture({action:'toggle-plugin',enabled:false});
  await page.waitForFunction(()=>![...document.querySelectorAll('style')].some(e=>e.textContent.includes('.tc-stage{')));
  assert.equal((await page.request.get('http://127.0.0.1:3345/api/thanks-carl/status')).status(),404);
  await fixture({action:'toggle-plugin',enabled:true});
  await page.waitForFunction(()=>[...document.querySelectorAll('style')].filter(e=>e.textContent.includes('.tc-stage{')).length===1);
  assert.equal((await page.request.get('http://127.0.0.1:3345/api/thanks-carl/status')).status(),200);
  results.tests.push('Native Loader disable removes route/styles/UI; re-enable registers exactly one clean instance without restarting Host');
  const data=await (await page.request.get('http://127.0.0.1:3345/api/thanks-carl-fixture')).json();assert.equal(data.modelRequests,0);results.modelRequests=data.modelRequests;
  assert.ok(!requests.some(r=>r.url==='/api/session/prompt'),'No real prompt RPC issued');assert.deepEqual(errors,[]);results.tests.push('No model stream, prompt RPC, external API, or page exception');
  results.passed=true;
} catch(error) {
  results.passed=false;results.failure=error.stack;results.debug=await page.evaluate(()=>({now:Date.now(),visibility:document.visibilityState,config:localStorage.getItem('thanks-carl.config.v1'),ledger:localStorage.getItem('thanks-carl.ledger.v1'),text:document.querySelector('[data-thanks-carl=overlay]')?.innerText})).catch(()=>null);await page.screenshot({path:'artifacts/screenshots/failure.png'}).catch(()=>{});throw error;
} finally {
  results.errors=errors;results.requests=requests;await writeFile('artifacts/browser-verification.json',JSON.stringify(results,null,2));await browser.close();console.log(JSON.stringify({...results,requests:`${requests.length} local API requests`},null,2));
}
