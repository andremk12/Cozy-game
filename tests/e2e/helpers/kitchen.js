/** React schedules the next walking segment after the previous timer commits.
 * Observe the DOM between clock steps so a single large jump cannot postpone
 * those commits until its end. The production movement is separately tested
 * with real time and screen coordinates in kitchen-refinements.spec.js. */
export async function advanceToKitchenPresentation(page) {
  await page.mouse.move(0, 0);
  for (let second = 0; second < 25; second += 1) {
    if (await page.locator('.kitchen-completion').count()) {
      await page.clock.runFor(32);
      return;
    }
    await page.clock.runFor(1000);
  }
  const state = await page.locator('.companion').evaluateAll((elements) => elements.map((element) => ({
    phase: element.dataset.kitchenPhase, action: element.dataset.kitchenAction,
    held: element.dataset.held, paused: element.dataset.paused,
  })));
  throw new Error(`Kitchen presentation did not settle after its bounded route: ${JSON.stringify(state)}`);
}
