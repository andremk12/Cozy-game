export const initialRitual = { phase: 'writing', draft: '' };

// The draft lives only in React memory. It never enters the preference service.
export function ritualReducer(state, action) {
  switch (action.type) {
    case 'WRITE':
      return state.phase === 'writing' ? { ...state, draft: action.value.slice(0, 2000) } : state;
    case 'RELEASE':
      if (state.phase !== 'writing' || !state.draft.trim()) return state;
      return { phase: action.reducedMotion ? 'complete' : 'folding', draft: '' };
    case 'SAIL':
      return state.phase === 'folding' ? { phase: 'sailing', draft: '' } : state;
    case 'COMPLETE':
      return ['folding', 'sailing'].includes(state.phase)
        ? { phase: 'complete', draft: '' }
        : state;
    case 'RESET':
      return { ...initialRitual };
    default:
      return state;
  }
}
