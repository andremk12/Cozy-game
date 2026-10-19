import { useEffect, useRef } from 'react';
import Icon from '../../components/Icon.jsx';
import River, { PaperBoat } from './River.jsx';
import './LetItFloat.css';

export default function LetItFloat({ ritual, dispatch, reducedMotion, onBack }) {
  const { phase, draft } = ritual;
  const field = useRef(null);
  useEffect(() => {
    if (phase === 'writing') field.current?.focus();
  }, [phase]);
  useEffect(() => {
    if (phase === 'writing' || phase === 'complete') return;
    if (reducedMotion) {
      dispatch({ type: 'COMPLETE' });
      return;
    }
    const timer = setTimeout(
      () => dispatch({ type: phase === 'folding' ? 'SAIL' : 'COMPLETE' }),
      phase === 'folding' ? 2200 : 14500,
    );
    return () => clearTimeout(timer);
  }, [phase, reducedMotion, dispatch]);

  return (
    <section className={`float-experience phase-${phase}`} aria-label="Ritual Let It Float">
      {phase === 'writing' ? (
        <>
          <form
            className="writing-paper"
            onSubmit={(event) => {
              event.preventDefault();
              dispatch({ type: 'RELEASE', reducedMotion });
            }}
          >
            <span className="eyebrow paper-eyebrow">UM PEQUENO RITUAL</span>
            <h2>
              Deixe o rio
              <br />
              levar um pouco.
            </h2>
            <p>Um pensamento, uma preocupação, o que quiser. Este papel é só seu.</p>
            <label className="sr-only" htmlFor="thought">
              O que você gostaria de deixar ir?
            </label>
            <textarea
              id="thought"
              ref={field}
              value={draft}
              onChange={(e) => dispatch({ type: 'WRITE', value: e.target.value })}
              maxLength={2000}
              placeholder="O que você gostaria de deixar ir?"
              spellCheck={false}
            />
            <div className="paper-actions">
              <button type="button" className="text-button" onClick={onBack}>
                Cancelar
              </button>
              <button className="release-button" disabled={!draft.trim()} type="submit">
                Let it float <Icon name="boat" size={21} />
              </button>
            </div>
            <span className="privacy-note">
              <Icon name="lock" size={13} /> Sem salvar. Sem enviar. Só deixar ir.
            </span>
          </form>
          <River>
            <div className="river-whisper">
              <span>let it float</span>
              <p>Há espaço para respirar.</p>
            </div>
            <PaperBoat className="preview-boat" />
          </River>
        </>
      ) : (
        <River phase={phase}>
          <div className="ritual-status" aria-live="polite" aria-atomic="true">
            <span className="eyebrow">LET IT FLOAT</span>
            <h2>
              {phase === 'folding'
                ? 'Um novo jeito de seguir.'
                : phase === 'sailing'
                  ? 'Pode deixar ir.'
                  : 'O rio segue. Você pode ficar.'}
            </h2>
            <p>
              {phase === 'complete'
                ? 'Seu pensamento seguiu seu caminho. Fique por aqui o tempo que quiser.'
                : 'Não há nada que você precise fazer agora.'}
            </p>
          </div>
          {phase === 'folding' && (
            <div className="folding-paper" aria-hidden="true">
              <span />
              <PaperBoat />
            </div>
          )}
          {(phase === 'sailing' || phase === 'complete') && (
            <PaperBoat className={phase === 'sailing' ? 'sailing-boat' : 'resting-boat'} />
          )}
          <div className="river-actions">
            {phase === 'complete' ? (
              <button className="soft-button" onClick={onBack}>
                <Icon name="back" size={16} /> Voltar ao quarto
              </button>
            ) : (
              <button className="soft-button subtle" onClick={() => dispatch({ type: 'COMPLETE' })}>
                Concluir sem animação
              </button>
            )}
          </div>
        </River>
      )}
    </section>
  );
}
