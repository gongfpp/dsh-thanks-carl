import assert from 'node:assert/strict';
import sharp from 'sharp';
import {ACTIONS} from '../src/actions.mjs';
export async function verifyActions({page,overlay,settings,controls,closeSettings,save,results}) {
  await page.emulateMedia({reducedMotion:'no-preference'});
  await settings();await controls.getByRole('button',{name:'恢复 Carl 原图',exact:true}).click();
  await controls.getByLabel('AI 多帧动作（可关闭恢复原图）',{exact:true}).check();
  await controls.getByLabel('模式',{exact:true}).selectOption('resident');await controls.getByLabel('活动方式',{exact:true}).selectOption('still');await controls.getByLabel('勿扰时段',{exact:true}).uncheck();
  await closeSettings();await page.mouse.click(1100,100);await page.clock.runFor(600);
  const sprite=overlay.locator('.tc-sprite-viewport'),pet=overlay.getByRole('button',{name:'卡尔：拖动停靠，点按互动',exact:true}),menu=overlay.getByRole('dialog',{name:'卡尔快捷菜单'});
  await sprite.waitFor();assert.equal(await sprite.getAttribute('data-carl-action'),'idle');
  const frame=await sprite.getAttribute('data-frame'),a=await pet.screenshot();await page.clock.runFor(900);const b=await pet.screenshot();const nextFrame=await sprite.getAttribute('data-frame');assert.notEqual(nextFrame,frame);
  const ar=await sharp(a).raw().toBuffer(),br=await sharp(b).raw().toBuffer();let changed=0;for(let i=0;i<ar.length;i++)if(ar[i]!==br[i])changed++;assert.ok(changed>100,`Real native-overlay sprite pixels change (${changed} bytes, frames ${frame}/${nextFrame})`);
  await save('19-ai-idle');
  for(const action of ACTIONS){
    await overlay.getByRole('button',{name:'卡尔菜单',exact:true}).click();await menu.locator('summary').filter({hasText:'动作彩蛋'}).click();
    await menu.getByRole('button',{name:action.label,exact:true}).click();await menu.waitFor({state:'hidden'});
    await overlay.locator(`[data-carl-action="${action.id}"][data-playing=true]`).waitFor();await page.clock.runFor(450);
    assert.ok(Number(await sprite.getAttribute('data-frame'))>0,`${action.id} advances real frames`);
    if(['wave','roll','belly_up'].includes(action.id))await save(`20-ai-${action.id}`);
    await page.clock.runFor(4600);await overlay.locator('[data-carl-action=idle]').waitFor();
  }
  results.tests.push(`All 12 approved AI actions play through the native quick menu, return cleanly; idle pixels change (${changed} channel bytes)`);
  await page.mouse.click(1100,100);await page.clock.runFor(300);await overlay.getByRole('button',{name:'卡尔菜单',exact:true}).click();const frozen=await sprite.getAttribute('data-frame');await page.clock.runFor(900);assert.equal(await sprite.getAttribute('data-frame'),frozen,'Menu pauses body frames');
  await menu.getByRole('button',{name:'安静一小时',exact:true}).click();await menu.getByRole('button',{name:/唤醒卡尔/}).waitFor();await page.keyboard.press('Escape');await page.mouse.click(1100,100);await page.clock.runFor(5000);await overlay.locator('[data-carl-action=sleepy][data-playing=false]').waitFor();const sleeping=await sprite.getAttribute('data-frame');await page.clock.runFor(1200);assert.equal(await sprite.getAttribute('data-frame'),sleeping);await save('21-ai-sleep');
  await overlay.getByRole('button',{name:'卡尔菜单',exact:true}).click();await menu.getByRole('button',{name:/唤醒卡尔/}).click();await menu.getByRole('button',{name:'专注 25 分钟',exact:true}).click();await page.locator('[data-focus-status=running]').waitFor();await overlay.locator('[data-carl-action=idle][data-playing=false]').waitFor();const focused=await sprite.getAttribute('data-frame');await page.clock.runFor(900);assert.equal(await sprite.getAttribute('data-frame'),focused,'Focus pauses body frames');await overlay.getByRole('button',{name:'结束专注',exact:true}).click();
  await page.emulateMedia({reducedMotion:'reduce'});await sprite.waitFor({state:'hidden'});assert.equal(await pet.locator('.tc-photo').evaluate(e=>getComputedStyle(e).visibility),'visible');
  await page.emulateMedia({reducedMotion:'no-preference'});await sprite.waitFor();
  await settings();await controls.getByLabel('AI 多帧动作（可关闭恢复原图）',{exact:true}).uncheck();await closeSettings();assert.equal(await sprite.count(),0);
  await settings();await controls.getByLabel('AI 多帧动作（可关闭恢复原图）',{exact:true}).check();await controls.locator('input[type=file]').setInputFiles('assets/carl-clear.png');await page.waitForFunction(()=>localStorage.getItem('thanks-carl.images.v1'));await closeSettings();assert.equal(await sprite.count(),0,'Custom photo is never replaced by AI');
  await settings();await controls.getByRole('button',{name:'恢复 Carl 原图',exact:true}).click();await closeSettings();await sprite.waitFor();
  results.tests.push('AI frame playback pauses for menu/focus/quiet; reduced-motion and AI-off restore original photo; custom photos are never replaced');
  await page.setViewportSize({width:390,height:600});await overlay.getByRole('button',{name:'卡尔菜单',exact:true}).click();await menu.locator('summary').filter({hasText:'动作彩蛋'}).click();await menu.getByRole('button',{name:'肚皮朝上',exact:true}).scrollIntoViewIfNeeded();const bounds=await menu.boundingBox();assert.ok(bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=390&&bounds.y+bounds.height<=600);assert.equal(await menu.evaluate(e=>e.scrollWidth<=e.clientWidth),true);await save('22-ai-mobile-menu');await page.keyboard.press('Escape');await page.setViewportSize({width:1440,height:960});
  results.tests.push('Expanded 12-action menu is usable and scrolls vertically without horizontal overflow on 390x600');
}
