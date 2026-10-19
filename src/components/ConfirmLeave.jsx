import { useEffect, useRef } from 'react';

export default function ConfirmLeave({ onStay, onDiscard }) {
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);
  return (
    <dialog
      className="leave-dialog"
      ref={dialog}
      onCancel={(event) => {
        event.preventDefault();
        onStay();
      }}
      aria-labelledby="leave-title"
      aria-describedby="leave-description"
    >
      <span className="eyebrow">SEU PAPEL AINDA ESTÁ AQUI</span>
      <h2 id="leave-title">Sair da escrita?</h2>
      <p id="leave-description">
        O que você escreveu será descartado ao sair. Você também pode ficar e terminar no seu tempo.
      </p>
      <div>
        <button className="soft-button" autoFocus onClick={onStay}>
          Continuar escrevendo
        </button>
        <button className="text-button" onClick={onDiscard}>
          Descartar e sair
        </button>
      </div>
    </dialog>
  );
}
