import type { WeatherKind } from "@/lib/domain/weather";
import { cn } from "@/lib/utils";

/**
 * Full-colour weather icons: a sun, clouds, drops and a bolt layered into one
 * picture per condition, so no two conditions share an icon.
 *
 * Gradients live in <WeatherIconDefs />, rendered once by the panel, so the
 * icons can share ids instead of each emitting a duplicate set. Cloud fills
 * use userSpaceOnUse: the three circles and the base share one gradient and
 * read as a single shape with no seams.
 */
export function WeatherIconDefs() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden focusable="false">
      <defs>
        <radialGradient id="wx-sun" cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#FFE58A" />
          <stop offset=".55" stopColor="#FDBA2C" />
          <stop offset="1" stopColor="#F59E0B" />
        </radialGradient>
        <linearGradient id="wx-cloud-light" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="28">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#CBD5E1" />
        </linearGradient>
        <linearGradient id="wx-cloud-gray" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="28">
          <stop offset="0" stopColor="#E2E8F0" />
          <stop offset="1" stopColor="#94A3B8" />
        </linearGradient>
        <linearGradient id="wx-cloud-dark" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="28">
          <stop offset="0" stopColor="#94A3B8" />
          <stop offset="1" stopColor="#475569" />
        </linearGradient>
        <linearGradient id="wx-drop" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7DD3FC" />
          <stop offset="1" stopColor="#0284C7" />
        </linearGradient>
        <linearGradient id="wx-bolt" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FDE047" />
          <stop offset="1" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function CloudShape({
  tone,
  x,
  y,
  scale = 1,
}: {
  tone: "light" | "gray" | "dark";
  x: number;
  y: number;
  scale?: number;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} fill={`url(#wx-cloud-${tone})`}>
      <circle cx="14" cy="18" r="10" />
      <circle cx="27" cy="13" r="13" />
      <circle cx="38" cy="19" r="9" />
      <rect x="4" y="18" width="43" height="10" rx="5" />
    </g>
  );
}

const RAY_ANGLES = Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4);

function SunShape({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <>
      <g stroke="#FBBF24" strokeWidth="3" strokeLinecap="round">
        {RAY_ANGLES.map((angle) => (
          <line
            key={angle}
            x1={cx + Math.cos(angle) * (r + 4)}
            y1={cy + Math.sin(angle) * (r + 4)}
            x2={cx + Math.cos(angle) * (r + 8)}
            y2={cy + Math.sin(angle) * (r + 8)}
          />
        ))}
      </g>
      <circle cx={cx} cy={cy} r={r} fill="url(#wx-sun)" />
    </>
  );
}

function Drop({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${scale})`}
      fill="url(#wx-drop)"
      d="M0 0C0 0-3.6 4.6-3.6 6.8a3.6 3.6 0 0 0 7.2 0C3.6 4.6 0 0 0 0z"
    />
  );
}

const ARTWORK: Record<WeatherKind, React.ReactNode> = {
  clear: <SunShape cx={32} cy={32} r={13} />,
  partly_cloudy: (
    <>
      <SunShape cx={24} cy={23} r={10} />
      <CloudShape tone="light" x={14} y={26} scale={0.95} />
    </>
  ),
  cloudy: (
    <>
      <CloudShape tone="gray" x={16} y={12} scale={0.8} />
      <CloudShape tone="light" x={6} y={24} scale={0.95} />
    </>
  ),
  fog: (
    <>
      <CloudShape tone="gray" x={8} y={10} />
      <g stroke="#94A3B8" strokeWidth="3" strokeLinecap="round">
        <line x1="12" y1="46" x2="44" y2="46" />
        <line x1="20" y1="53" x2="52" y2="53" />
      </g>
    </>
  ),
  drizzle: (
    <>
      <CloudShape tone="gray" x={8} y={10} />
      <Drop x={24} y={44} scale={0.8} />
      <Drop x={38} y={44} scale={0.8} />
    </>
  ),
  rain: (
    <>
      <CloudShape tone="gray" x={8} y={10} />
      <Drop x={20} y={43} />
      <Drop x={32} y={47} />
      <Drop x={44} y={43} />
    </>
  ),
  heavy_rain: (
    <>
      <CloudShape tone="dark" x={8} y={8} />
      <Drop x={17} y={41} />
      <Drop x={27} y={46} />
      <Drop x={37} y={41} />
      <Drop x={47} y={46} />
      <Drop x={22} y={52} scale={0.8} />
      <Drop x={42} y={52} scale={0.8} />
    </>
  ),
  thunderstorm: (
    <>
      <CloudShape tone="dark" x={8} y={6} />
      <path fill="url(#wx-bolt)" d="M33 33 24 47h7l-4 13 14-17h-7l4-10z" />
      <Drop x={18} y={42} />
      <Drop x={47} y={42} />
    </>
  ),
};

/** A condition's icon; a plain cloud when the condition is unknown. */
export function WeatherIcon({
  kind,
  className,
}: {
  kind: WeatherKind | null;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 64 64" className={cn("shrink-0", className)} aria-hidden focusable="false">
      {ARTWORK[kind ?? "cloudy"]}
    </svg>
  );
}
