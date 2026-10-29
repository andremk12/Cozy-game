export default function Icon({ name, size = 20, ...props }) {
  const paths = {
    room: (
      <>
        <path d="m3 10 9-7 9 7v11H3Z" />
        <path d="M9 21v-8h6v8M6 7V3h3" />
      </>
    ),
    garden: (
      <>
        <path d="M12 21v-8C4 15 2 8 3 4c6-1 10 2 9 9 0-7 5-10 10-8 0 6-4 9-10 8" />
        <path d="m5 7 7 6 6-5" />
      </>
    ),
    journey: (
      <>
        <rect x="5" y="3" width="14" height="16" rx="3" />
        <path d="M5 11h14M12 3v8M7 22l2-3m8 3-2-3M8 15h1m6 0h1" />
      </>
    ),
    boat: (
      <>
        <path d="m2 15 4 5h12l4-5H2Zm10 0V3l7 9h-7" />
        <path d="M3 23c2-2 4 0 6 0s4-2 6-1 4 2 6 0" />
      </>
    ),
    sound: (
      <>
        <path d="M11 4 6 8H2v8h4l5 4V4Zm4 4c3 2 3 6 0 8m3-11c5 4 5 10 0 14" />
      </>
    ),
    mute: (
      <>
        <path d="M11 4 6 8H2v8h4l5 4V4Zm5 5 6 6m0-6-6 6" />
      </>
    ),
    mixer: <path d="M5 3v6m0 4v8M12 3v11m0 4v3M19 3v3m0 4v11M2 9h6v4H2zM9 14h6v4H9zM16 6h6v4h-6z" />,
    companion: <path d="M4 11V3l6 4h4l6-4v8l1 4-3 6H6l-3-6 1-4Zm4 2h.01M16 13h.01M10 17h4m-2-2v2M1 14l5 1m-5 3 5-1m17-3-5 1m5 3-5-1" />,
    wind: <path d="M3 8h11c4 0 4-5 1-5-2 0-3 1-3 2M2 12h17c4 0 4 6 0 6-2 0-3-1-3-2M4 16h6c3 0 3 5 0 5" />,
    leaves: <path d="M12 21V11M12 16C5 17 2 12 3 7c5-1 9 2 9 7 0-8 4-12 10-11 0 7-3 11-10 11M6 11l6 5m0-5 6-5" />,
    bird: <path d="m3 15 5-2C8 7 12 4 16 7l3-1-1 4 4 2-5 1c-2 5-8 7-14 2Zm8 4-2 3m5-4v4M14 9h.01" />,
    stream: <path d="M3 5c3-2 5 2 8 0s6-2 10 0M3 12c3-2 5 2 8 0s6-2 10 0M3 19c3-2 5 2 8 0s6-2 10 0" />,
    cricket: <path d="M9 12c-4-7 1-10 3-7 2-3 7 0 3 7M7 13h10l2 7H5l2-7Zm2-4L5 6m10 3 4-3M8 15l-5-4m13 4 5-4M8 19l-5 3m13-3 5 3M12 12v8" />,
    fire: <path d="M8 21c-7-4-3-10 0-12 0 3 1 4 2 4 0-6 2-7 3-11 6 5 11 15 3 19H8Zm1-1c-2-2 0-5 3-7 0 3 5 5 2 7M4 23h16" />,
    windowRain: <path d="M3 3h18v16H3zM12 3v16M3 11h18M6 6l-1 2m4 6-1 3m10-3-1 3M1 22h22" />,
    rails: <path d="m8 2-4 20M16 2l4 20M8 5h8M7 10h10M6 15h12M5 20h14" />,
    wheels: <><circle cx="7" cy="14" r="4" /><circle cx="18" cy="14" r="4" /><path d="M3 5h19M5 5v5m15-5v5M7 14h11M3 22h19" /></>,
    carriage: <path d="M3 3h18v18H3zM6 6h5v7H6zM14 6h4v7h-4zM6 17h12M9 17v4m6-4v4" />,
    moon: <path d="M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z" />,
    sunset: <path d="M3 16h18M6 16a6 6 0 0 1 12 0M12 2v3M3 7l2 2m16-2-2 2M7 20h10" />,
    rain: (
      <>
        <path d="M6 13a4 4 0 1 1 1-8 6 6 0 0 1 11 2 3 3 0 0 1 1 6H6Z" />
        <path d="m7 16-2 4m8-4-2 4m8-4-2 4" />
      </>
    ),
    lamp: (
      <>
        <path d="m8 3-4 10h16L16 3H8Zm4 10v8m-5 0h10" />
        <path d="M19 14v4" />
      </>
    ),
    back: (
      <>
        <path d="m10 5-7 7 7 7M3 12h18" />
      </>
    ),
    close: <path d="m6 6 12 12M18 6 6 18" />,
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3" />
      </>
    ),
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    expand: <path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6" />,
    collapse: <path d="M3 9h6V3m12 6h-6V3M9 21v-6H3m12 6v-6h6" />,
    check: <path d="m4 12 5 5L20 6" />,
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name] || paths.moon}
    </svg>
  );
}
