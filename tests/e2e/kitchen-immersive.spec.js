import { test, expect } from '@playwright/test';
import { createKitchen } from '../../shared/kitchen.js';

async function open(page){await page.goto('/');await page.getByRole('button',{name:'The Cozy Kitchen',exact:true}).click();await expect(page.locator('.kitchen-scene')).toBeVisible();}

test('kitchen fullscreen retains its art, clock and recipe book with contextual Escape and M/C shortcuts',async({page})=>{
  await open(page);
  await page.evaluate(()=>{window.__kitchenArt=document.querySelector('.kitchen-art');});
  await page.getByRole('button',{name:'Modo Imersivo',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>document.fullscreenElement?.classList.contains('immersive-viewport'))).toBe(true);
  expect(await page.evaluate(()=>window.__kitchenArt===document.querySelector('.kitchen-art'))).toBe(true);
  await page.locator('.kitchen-immersive-book').click();
  await expect(page.getByRole('dialog',{name:'Livro de receitas',exact:true})).toBeVisible();
  await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(()=>Boolean(document.fullscreenElement))).toBe(true);
  await page.keyboard.press('m');await expect(page.getByRole('dialog',{name:'Cozy Sound Mixer',exact:true})).toBeVisible();await page.keyboard.press('Escape');
  await page.keyboard.press('c');await expect(page.getByRole('dialog',{name:'My Companion',exact:true})).toBeVisible();await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Relógio da cozinha',exact:true}).focus();await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog',{name:'Relógio da cozinha',exact:true})).toBeVisible();await page.keyboard.press('Escape');
  await expect(page.getByRole('button',{name:'Relógio da cozinha',exact:true})).toBeFocused();
  await page.keyboard.press('Escape');await expect.poll(()=>page.evaluate(()=>document.fullscreenElement)).toBe(null);
  await expect(page.getByRole('button',{name:'Modo Imersivo',exact:true})).toBeFocused();
});

test('reduced motion keeps recipes usable and timer running while every kitchen animation is static',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.clock.install();await open(page);
  await page.getByRole('button',{name:'Livro de receitas',exact:true}).first().click();
  await page.getByRole('button',{name:'Começar esta receita',exact:true}).click();
  await page.getByRole('button',{name:'Chaleira',exact:true}).click();
  expect(await page.locator('.kitchen-art').evaluate(element=>[element,...element.querySelectorAll('*')].every(node=>getComputedStyle(node).animationName==='none'))).toBe(true);
  await page.clock.fastForward(300_100);await expect(page.locator('.kitchen-completion')).toBeVisible();
  expect(await page.locator('.kitchen-completion').evaluate(element=>getComputedStyle(element).animationName)).toBe('none');
});

test('all six navigation entries, the illustrated book and final message fit small windows',async({page})=>{
  const fixture=createKitchen();fixture.session={id:'00000000-0000-4000-8000-000000000009',recipeId:'cake',durationMs:3_600_000,elapsedMs:3_600_000,updatedAt:Date.now(),status:'completed',presentation:'pending',completedAt:Date.now()};
  await page.addInitScript(value=>localStorage.setItem('haven.kitchen.v1',JSON.stringify(value)),fixture);
  await page.setViewportSize({width:390,height:844});await open(page);
  await expect(page.locator('.kitchen-completion')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('.kitchen-completion').getByRole('button',{name:'Preparar outra receita',exact:true}).click();
  const book=page.getByRole('dialog',{name:'Livro de receitas',exact:true});
  await expect(book).toBeVisible();expect(await book.evaluate(element=>element.scrollWidth<=element.clientWidth+1)).toBe(true);
  const start=book.getByRole('button',{name:'Começar esta receita',exact:true});
  for(let i=0;i<14;i++){await page.keyboard.press('Tab');if(await start.evaluate(element=>element===document.activeElement))break;}
  await expect(start).toBeFocused();
  expect(await start.evaluate(element=>{const bounds=element.getBoundingClientRect();return bounds.top>=0&&bounds.bottom<=innerHeight;})).toBe(true);
  await page.keyboard.press('Escape');
  for(const size of [{width:360,height:780},{width:800,height:650},{width:1440,height:960}]){await page.setViewportSize(size);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(page.getByRole('button',{name:'The Cozy Kitchen',exact:true})).toBeVisible();}
});
