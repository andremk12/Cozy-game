import { useId } from 'react';
import KitchenRecipeArt from './KitchenRecipeArt.jsx';

export default function KitchenCompletion({ recipe, companion, animate = false, onRest, onAnother, onClose }) {
  const title = useId();
  return <section className="kitchen-completion" role="region" aria-labelledby={title}>
    <header className="kitchen-completion-header">
      <div className="kitchen-completion-dish"><KitchenRecipeArt recipeId={recipe.id} animate={animate} /></div>
      <h2 id={title}>{recipe.completionTitle}</h2>
      <button type="button" className="kitchen-completion-close" aria-label="Fechar conclusão da receita" onClick={onClose}>Fechar</button>
    </header>
    <div className="kitchen-speech-body" tabIndex="0" aria-label="Mensagem da receita"><p>{recipe.completionMessage}</p>
      <span className="kitchen-chef-signature">{companion?.settings?.name ? `— ${companion.settings.name}, seu pequeno chef ♡` : '— Seu pequeno chef ♡'}</span>
    </div>
    <div className="kitchen-completion-actions"><button type="button" onClick={onRest}>Descansar um pouquinho</button><button type="button" onClick={onAnother}>Preparar outra receita</button></div>
  </section>;
}
