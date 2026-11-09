import { test, expect } from '@playwright/test';
import { KITCHEN_RECIPES } from '../../shared/kitchenRecipes.js';
import { createKitchen } from '../../shared/kitchen.js';
import { installAudioProbe, audioSnapshot } from './helpers/audio.js';
import { advanceToKitchenPresentation } from './helpers/kitchen.js';

const diagnostics = new WeakMap();
const scene = page=>page.locator('.kitchen-scene');
const book = page=>page.getByRole('dialog',{name:'Livro de receitas',exact:true});
const nav = page=>page.getByRole('button',{name:'The Cozy Kitchen',exact:true});
const completion = page=>page.locator('.kitchen-completion');
const clock = page=>page.getByRole('button',{name:'Relógio da cozinha',exact:true});
const prefs={companion:{enabled:true,name:'Chá de Lua',appearance:'midnight',soundEnabled:false,introduced:true}};

test.beforeEach(async({page})=>{
  const recorded={errors:[],external:[]};diagnostics.set(page,recorded);
  page.on('pageerror',error=>recorded.errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')recorded.errors.push(message.text());});
  page.on('request',request=>{const url=new URL(request.url());if(['http:','https:','ws:','wss:'].includes(url.protocol)&&url.hostname!=='127.0.0.1')recorded.external.push(url.href);});
  await installAudioProbe(page);
  await page.addInitScript(value=>{if(!localStorage.getItem('haven.preferences.v1'))localStorage.setItem('haven.preferences.v1',JSON.stringify(value));},prefs);
});
test.afterEach(async({page})=>{
  expect(diagnostics.get(page).errors).toEqual([]);
  expect(diagnostics.get(page).external).toEqual([]);
});

async function open(page){await page.goto('/');await nav(page).click();await expect(scene(page)).toBeVisible();}
async function openBook(page){await page.getByRole('button',{name:'Livro de receitas',exact:true}).first().click();await expect(book(page)).toBeVisible();}
async function start(page,recipe){
  await openBook(page);
  await book(page).locator('.kitchen-recipe-option').filter({hasText:recipe.name}).click();
  await book(page).getByRole('button',{name:'Começar esta receita',exact:true}).click();
  await expect(book(page)).toHaveCount(0);
  await expect(scene(page)).toHaveAttribute('data-status','running');
}
async function saved(page){return page.evaluate(()=>JSON.parse(localStorage.getItem('haven.kitchen.v1')));}

for(const recipe of KITCHEN_RECIPES){
  test(`${recipe.name}: correct duration, original dish and one gentle completion`,async({page})=>{
    await page.clock.install({time:new Date('2026-10-30T12:00:00Z')});
    await open(page);await start(page,recipe);
    expect((await saved(page)).session.durationMs).toBe(recipe.durationMs);
    await page.clock.fastForward(recipe.durationMs+100);
    await expect(scene(page)).toHaveAttribute('data-status','completed');
    await expect(scene(page)).toHaveAttribute('data-stage','ready');
    await expect(scene(page).locator('.sr-only[role="status"]')).toHaveText(recipe.completionTitle);
    // The real recipe is finished; the chef now follows its bounded route to
    // the table before presenting the message and its optional sound.
    await advanceToKitchenPresentation(page);
    await expect(completion(page)).toBeVisible();
    await expect(completion(page).getByRole('heading',{name:recipe.completionTitle,exact:true})).toBeVisible();
    await expect(completion(page).getByText(recipe.completionMessage,{exact:true})).toBeVisible();
    await expect(completion(page)).toContainText('— Chá de Lua, seu pequeno chef ♡');
    await expect(completion(page).locator(`[data-recipe-art="${recipe.id}"]`)).toHaveCount(1);
    await expect(page.locator('.companion')).toHaveAttribute('data-kitchen-action','presenting');
    expect((await audioSnapshot(page)).contexts).toBe(0);
    await completion(page).getByRole('button',{name:'Fechar conclusão da receita',exact:true}).click();
    await expect(completion(page)).toHaveCount(0);
    await page.getByRole('button',{name:'The Room',exact:true}).click();await nav(page).click();
    await expect(completion(page)).toHaveCount(0);
    await expect(scene(page).locator('.kitchen-art [data-recipe-art]')).toHaveAttribute('data-recipe-art',recipe.id);
    await page.reload();await nav(page).click();
    await expect(completion(page)).toHaveCount(0);
    await expect(scene(page)).toHaveAttribute('data-status','completed');
  });
}

test('book lists all seven recipes and validates custom duration without starting a second session',async({page})=>{
  await page.clock.install();await open(page);await openBook(page);
  const options=book(page).locator('.kitchen-recipe-option');
  await expect(options).toHaveCount(7);
  for(let i=0;i<KITCHEN_RECIPES.length;i++){await expect(options.nth(i)).toContainText(KITCHEN_RECIPES[i].name);await expect(options.nth(i)).toContainText(`${KITCHEN_RECIPES[i].minutes} minutos`);}
  await options.last().click();await book(page).getByLabel('Escolher meu tempo',{exact:true}).check();
  const custom=book(page).getByRole('spinbutton',{name:'Duração personalizada em minutos',exact:true});
  await custom.fill('4');await book(page).getByRole('button',{name:'Começar esta receita',exact:true}).click();await expect(book(page).getByRole('alert')).toContainText('entre 5 e 60');
  await custom.fill('61');await book(page).getByRole('button',{name:'Começar esta receita',exact:true}).click();await expect(book(page).getByRole('alert')).toBeVisible();
  await custom.fill('7');await book(page).getByRole('button',{name:'Começar esta receita',exact:true}).click();
  await expect(scene(page)).toHaveAttribute('data-recipe','cake');expect((await saved(page)).session.durationMs).toBe(7*60_000);
  const id=(await saved(page)).session.id;
  await openBook(page);await options.first().click();await book(page).getByRole('button',{name:'Começar esta receita',exact:true}).click();
  await expect(book(page).getByRole('button',{name:'Encerrar e preparar esta receita',exact:true})).toBeVisible();expect((await saved(page)).session.id).toBe(id);
  await book(page).getByRole('button',{name:'Manter a receita atual',exact:true}).click();await book(page).getByRole('button',{name:'Fechar livro de receitas',exact:true}).click();
  await page.clock.fastForward(7*60_000+100);await advanceToKitchenPresentation(page);await expect(completion(page).getByRole('heading',{name:'O bolo ficou pronto!',exact:true})).toBeVisible();
  await completion(page).getByRole('button',{name:'Preparar outra receita',exact:true}).click();await expect(book(page)).toBeVisible();
});

test('pause, navigation, cancellation and restart keep timer and visual state coherent',async({page})=>{
  await page.clock.install();await open(page);await start(page,KITCHEN_RECIPES[0]);
  await page.clock.fastForward(60_000);await page.getByRole('button',{name:'Pausar receita',exact:true}).click();
  const paused=(await saved(page)).session.elapsedMs;
  await page.getByRole('button',{name:'The Journey',exact:true}).click();await page.clock.fastForward(600_000);await nav(page).click();
  await expect(scene(page)).toHaveAttribute('data-status','paused');expect((await saved(page)).session.elapsedMs).toBe(paused);
  await page.getByRole('button',{name:'Retomar receita',exact:true}).click();
  await page.getByRole('button',{name:'The Room',exact:true}).click();await page.clock.fastForward(240_100);await nav(page).click();
  await expect(completion(page)).toBeVisible();await completion(page).getByRole('button',{name:'Descansar um pouquinho',exact:true}).click();
  await expect(completion(page)).toHaveCount(0);await expect(scene(page)).toHaveAttribute('data-status','completed');
  await clock(page).click();const dialog=page.getByRole('dialog',{name:'Relógio da cozinha',exact:true});
  await dialog.getByRole('button',{name:'Reiniciar receita',exact:true}).click();await dialog.getByRole('button',{name:'Confirmar reinício',exact:true}).click();
  await expect(scene(page)).toHaveAttribute('data-status','running');
  await clock(page).click();await dialog.getByRole('button',{name:'Encerrar antecipadamente',exact:true}).click();await dialog.getByRole('button',{name:'Confirmar encerramento',exact:true}).click();
  await page.clock.fastForward(600_000);await expect(scene(page)).toHaveAttribute('data-status','cancelled');await expect(completion(page)).toHaveCount(0);
});

test('cake follows all six stages automatically and presents only after real completion',async({page})=>{
  await page.clock.install();await open(page);await start(page,KITCHEN_RECIPES.at(-1));
  const stages=[['ingredients',0],['batter',6],['oven',16],['baking',21],['chocolate',45],['serving',55]];
  let previous=0;
  for(const [stage,minutes]of stages){await page.clock.fastForward((minutes-previous)*60_000);previous=minutes;await expect(scene(page)).toHaveAttribute('data-stage',stage);await expect(completion(page)).toHaveCount(0);await expect(scene(page).locator('.kitchen-art [data-recipe-art="cake"].is-ready')).toHaveCount(0);}
  await page.clock.fastForward(5*60_000+100);await expect(scene(page)).toHaveAttribute('data-stage','ready');await advanceToKitchenPresentation(page);await expect(completion(page)).toBeVisible();
});

test('objects work without a session and never alter a paused recipe, hidden companion stays hidden',async({page})=>{
  await page.clock.install();await open(page);
  await page.getByRole('button',{name:'Geladeira',exact:true}).click();await expect(page.getByRole('button',{name:'Geladeira',exact:true})).toHaveAttribute('aria-expanded','true');
  await page.getByRole('button',{name:'Chaleira',exact:true}).click();await expect(page.locator('.kitchen-kettle-steam')).toBeVisible();
  await page.getByRole('button',{name:'Utensílios da cozinha',exact:true}).click();await expect(page.locator('.kitchen-utensils')).toHaveClass(/is-touched/);
  await page.getByRole('button',{name:'Bilhete da geladeira',exact:true}).click();await expect(page.getByRole('dialog',{name:'Um pequeno bilhete',exact:true})).toBeVisible();await page.keyboard.press('Escape');
  await start(page,KITCHEN_RECIPES[0]);await page.getByRole('button',{name:'Pausar receita',exact:true}).click();const before=(await saved(page)).session;
  await page.getByRole('button',{name:'Luminárias da cozinha',exact:true}).click();await page.getByRole('button',{name:'Janela da cozinha',exact:true}).click();
  const atmosphere=page.getByRole('dialog',{name:'Luz e sons da cozinha',exact:true});
  await atmosphere.getByRole('combobox',{name:'Luz da janela',exact:true}).selectOption('night');await atmosphere.getByRole('combobox',{name:'Clima da cozinha',exact:true}).selectOption('rain');await atmosphere.getByLabel('Frases ocasionais do companheiro',{exact:true}).uncheck();await page.keyboard.press('Escape');
  expect((await saved(page)).session).toEqual(before);
  await page.getByRole('button',{name:'Abrir My Companion',exact:true}).click();const panel=page.getByRole('dialog',{name:'My Companion',exact:true});await panel.getByRole('switch',{name:'Mostrar companheiro',exact:true}).click();await panel.getByRole('button',{name:'Fechar My Companion',exact:true}).click();
  await expect(page.locator('.companion')).toHaveCount(0);await page.getByRole('button',{name:'Retomar receita',exact:true}).click();await page.clock.fastForward(300_100);
  await expect(completion(page)).toBeVisible();await expect(page.locator('.companion')).toHaveCount(0);await expect(completion(page)).toContainText('Chá de Lua');expect((await audioSnapshot(page)).contexts).toBe(0);
});

test('completed in another environment stays pending until the kitchen returns and reloading never replays a presented card',async({page})=>{
  const fixture=createKitchen();fixture.session={id:'00000000-0000-4000-8000-000000000001',recipeId:'tea',durationMs:300_000,elapsedMs:299_000,updatedAt:Date.now(),status:'paused',presentation:'closed',completedAt:null};
  await page.addInitScript(value=>{if(!localStorage.getItem('haven.kitchen.v1'))localStorage.setItem('haven.kitchen.v1',JSON.stringify(value));},fixture);
  await page.clock.install();await open(page);await page.getByRole('button',{name:'Retomar receita',exact:true}).click();await page.getByRole('button',{name:'Let It Float',exact:true}).click();await page.clock.fastForward(2_000);
  await expect(completion(page)).toHaveCount(0);expect((await saved(page)).session.presentation).toBe('pending');
  await nav(page).click();await expect(completion(page)).toBeVisible();expect((await saved(page)).session.presentation).toBe('presented');await page.reload();await nav(page).click();await expect(completion(page)).toHaveCount(0);
});

test('navigation during a delayed desktop completion claim preserves one presentation for the return',async({page})=>{
  const fixture=createKitchen();fixture.session={id:'00000000-0000-4000-8000-000000000008',recipeId:'tea',durationMs:300_000,elapsedMs:300_000,updatedAt:Date.now(),status:'completed',presentation:'pending',completedAt:Date.now()};
  await page.addInitScript(value=>{
    const kitchen=value;
    window.haven={
      getKitchen:async()=>({kitchen:structuredClone(kitchen),status:'ok'}),
      commandKitchen:async(command)=>{
        if(command.type==='present'){
          window.__kitchenClaimRequested=true;
          return new Promise(resolve=>{window.__finishKitchenClaim=()=>{kitchen.session.presentation='presented';resolve({kitchen:structuredClone(kitchen),status:'ok',presented:true});};});
        }
        if(command.type==='close')kitchen.session.presentation='closed';
        return{kitchen:structuredClone(kitchen),status:'ok',presented:false};
      },
      onKitchenChanged:()=>()=>{},
    };
  },fixture);
  await open(page);await expect.poll(()=>page.evaluate(()=>window.__kitchenClaimRequested)).toBe(true);
  await page.getByRole('button',{name:'The Room',exact:true}).click();await page.evaluate(()=>window.__finishKitchenClaim());
  await expect(completion(page)).toHaveCount(0);await nav(page).click();await expect(completion(page)).toBeVisible();
  await expect(completion(page).getByRole('heading',{name:'Seu chá está pronto!',exact:true})).toBeVisible();
  await completion(page).getByRole('button',{name:'Fechar conclusão da receita',exact:true}).click();
  await page.getByRole('button',{name:'The Room',exact:true}).click();await nav(page).click();await expect(completion(page)).toHaveCount(0);
  await page.getByRole('button',{name:'Prato pronto na mesa',exact:true}).click();await expect(completion(page)).toBeVisible();
  expect((await audioSnapshot(page)).contexts).toBe(0);
  await expect(page.locator('.companion-chef')).not.toHaveClass(/is-presenting/);
});
