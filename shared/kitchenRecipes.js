// Original, local recipe descriptions. Durations represent focus sessions only.
export const KITCHEN_RECIPES = Object.freeze([
  { id: 'tea', name: 'Chá Quentinho', minutes: 5,
    description: 'Uma xícara quentinha para acompanhar um pequeno momento só seu.',
    completionTitle: 'Seu chá está pronto!',
    completionMessage: 'O chá está quentinho! Preparei com carinho para você. Até as pequenas pausas merecem ser especiais. ♡' },
  { id: 'toast', name: 'Torradas da Manhã', minutes: 10,
    description: 'Pão douradinho e uma manhã que pode começar com calma.',
    completionTitle: 'Torradinhas prontas!',
    completionMessage: 'As torradinhas ficaram prontas! Um pouquinho de cada vez, e as coisas vão tomando forma. Que tal aproveitar esse momento?' },
  { id: 'cookies', name: 'Biscoitos Caseiros', minutes: 15,
    description: 'Pequenos biscoitos e aquele cheirinho de casa pela cozinha.',
    completionTitle: 'Biscoitinhos saindo do forno!',
    completionMessage: 'Hmm, que cheirinho bom! Os biscoitos ficaram prontos. Espero que esses minutinhos tenham sido tão gostosos quanto eles!' },
  { id: 'soup', name: 'Sopa Aconchegante', minutes: 25,
    description: 'Uma panela colorida, fogo baixinho e espaço para respirar.',
    completionTitle: 'A sopinha ficou pronta!',
    completionMessage: 'A sopinha ficou pronta! Fiz tudo com muito carinho. Agora podemos descansar um pouquinho, se você quiser.' },
  { id: 'pasta', name: 'Macarrão Caseiro', minutes: 35,
    description: 'Massa, molho e o carinho das coisas preparadas devagar.',
    completionTitle: 'O macarrão está na mesa!',
    completionMessage: 'O macarrão está prontinho! Algumas coisas ficam melhores quando damos tempo a elas. Espero que tenha aproveitado esse momento.' },
  { id: 'bread', name: 'Pão Quentinho', minutes: 45,
    description: 'A massa descansa e cresce enquanto você segue no seu ritmo.',
    completionTitle: 'Pão fresquinho!',
    completionMessage: 'Olha como o pão cresceu! Às vezes, tudo que precisamos é de um pouco de tempo e paciência. Fiz uma fatia especialmente para você!' },
  { id: 'cake', name: 'Bolo de Cenoura com Chocolate', minutes: 60,
    description: 'Massa dourada e cobertura de chocolate para um momento de aconchego.',
    completionTitle: 'O bolo ficou pronto!',
    completionMessage: 'O bolo ficou pronto! Olha só o que a gente preparou! Você merece uma pausinha. Fiz com carinho, especialmente para você! ♡' },
].map((recipe) => Object.freeze({ ...recipe, durationMs: recipe.minutes * 60_000 })));

export function getKitchenRecipe(id) {
  return KITCHEN_RECIPES.find((recipe) => recipe.id === id) ?? null;
}
