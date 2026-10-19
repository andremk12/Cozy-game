import Icon from '../../components/Icon.jsx';
import './Planned.css';

export default function Planned({ world, onBack }) {
  const garden = world === 'garden';
  return (
    <section
      className={`planned-world planned-${world}`}
      aria-label={garden ? 'The Garden: ambiente planejado' : 'The Journey: ambiente planejado'}
    >
      <svg
        className="planned-art"
        viewBox="0 0 480 220"
        shapeRendering="crispEdges"
        aria-hidden="true"
      >
        <rect width="480" height="220" fill={garden ? '#344d49' : '#3a4a5d'} />
        <path
          d="M0 145h48v-21h50v11h45v-32h50v15h42v-28h55v31h51v-17h48v23h44v-14h47v107H0Z"
          fill={garden ? '#47604e' : '#4c626a'}
        />
        <path
          d="M0 174h48v-14h55v11h50v-16h48v19h70v-24h67v17h55v-12h55v22h32v43H0Z"
          fill={garden ? '#5d7358' : '#6a7c7a'}
        />
        <path d="M376 26h20v4h6v20h-6v5h-20v-5h-6V32h6Z" fill="#dbd6b1" />
        {garden ? (
          <g>
            <path d="M201 184h78v7h-78Zm8 7h62v29h-62Z" fill="#b68c6c" />
            <path d="M215 191h50v4h-50Z" fill="#d3a27b" />
            <path
              d="M238 187v-60h5v60Zm-21-46h22v17h-14v-7h-8Zm26-18h23v9h-9v10h-14Z"
              fill="#9bac76"
            />
            <path
              d="M239 129v-24h5v24Zm-8-24h20v-8h-20Zm-7-8h34v-11h-34Zm7-11h20v-7h-20Z"
              fill="#d9bc9b"
            />
          </g>
        ) : (
          <g>
            <path d="M188 91h105v14h9v99H179v-99h9Z" fill="#a4a798" />
            <path d="M190 110h101v49H190Z" fill="#2e4651" />
            <path d="M238 110h5v49h-5ZM179 172h123v10H179Z" fill="#d3b592" />
            <path
              d="M196 188h11v7h-11Zm78 0h11v7h-11ZM184 204h113v7H184Zm8 7h7v9h-7Zm91 0h7v9h-7Z"
              fill="#283e45"
            />
          </g>
        )}
      </svg>
      <div className="planned-copy">
        <span className="planned-label">UM FUTURO CANTINHO · EM PLANEJAMENTO</span>
        <h2>{garden ? 'Tudo floresce no seu tempo.' : 'Uma viagem sem pressa de chegar.'}</h2>
        <p>
          {garden
            ? 'Um jardim para cultivar pequenos momentos. Ainda estamos preparando a terra por aqui.'
            : 'Paisagens pela janela, o balanço do trem e tempo para olhar lá fora. Esse caminho ainda está sendo preparado.'}
        </p>
        <button className="soft-button" onClick={onBack}>
          <Icon name="back" size={16} /> Voltar ao quarto
        </button>
      </div>
    </section>
  );
}
