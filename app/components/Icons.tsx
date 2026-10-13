// Enkle strek-ikoner (samme stil overalt), i stedet for emoji.
type IconProps = { size?: number; filled?: boolean; strokeWidth?: number };

function Svg({ size = 24, strokeWidth = 2, filled = false, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function HeartIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.5 8.1 3.6 4.5 7.2 4.5c2 0 3.4 1.1 4.8 2.8 1.4-1.7 2.8-2.8 4.8-2.8 3.6 0 5.7 3.6 4.5 6.8-1.8 4.6-9.3 9.2-9.3 9.2z" />
    </Svg>
  );
}

export function CommentIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M20.5 11.5a8.5 8.5 0 0 1-12.4 7.6L3.5 20.5l1.4-4.4A8.5 8.5 0 1 1 20.5 11.5z" />
    </Svg>
  );
}

export function ShareIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M21 3 10 14" />
      <path d="M21 3 14.5 21l-4.5-7-7-4.5L21 3z" />
    </Svg>
  );
}

export function BagIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 8h14l-1 12.5H6L5 8z" />
      <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
    </Svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </Svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </Svg>
  );
}

export function MailIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m4 7 8 6 8-6" />
    </Svg>
  );
}

export function SoundOnIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
      <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" />
    </Svg>
  );
}

export function SoundOffIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
      <path d="m16 9.5 5 5M21 9.5l-5 5" />
    </Svg>
  );
}
