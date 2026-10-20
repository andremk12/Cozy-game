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
