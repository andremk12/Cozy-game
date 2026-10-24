import { useEffect, useRef, useState } from 'react';

// Objects belong to this carriage visit, without new persistent preferences.
export function useJourneyObjects() {
  const [lampOn, setLampOn] = useState(true);
  const [curtainsOpen, setCurtainsOpen] = useState(true);
  const [tea, setTea] = useState({ state: 'cold', serving: 0 });
  const [keepsake, setKeepsake] = useState(null);
  const opener = useRef(null);

  useEffect(() => {
    if (tea.state === 'cold') return undefined;
    const timer = setTimeout(() => {
      setTea((current) => ({ ...current, state: current.state === 'warm' ? 'cooling' : 'cold' }));
    }, tea.state === 'warm' ? 12000 : 18000);
    return () => clearTimeout(timer);
  }, [tea]);

  function openKeepsake(kind, event) {
    opener.current = event.currentTarget;
    setKeepsake(kind);
  }

  function closeKeepsake() {
    setKeepsake(null);
    // The native dialog restores focus as it closes; also cover pointer-opened SVG.
    opener.current?.focus({ preventScroll: true });
  }

  return {
    lampOn,
    toggleLamp: () => setLampOn((value) => !value),
    curtainsOpen,
    toggleCurtains: () => setCurtainsOpen((value) => !value),
    teaState: tea.state,
    teaServing: tea.serving,
    prepareTea: () => setTea((value) => ({ state: 'warm', serving: value.serving + 1 })),
    keepsake,
    openKeepsake,
    closeKeepsake,
  };
}
