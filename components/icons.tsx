import type { ReactNode } from "react";

type IconProps = { className?: string };

function Svg({ className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function ChartBarIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <rect x="3" y="12" width="3.5" height="8" rx="1" />
      <rect x="10.25" y="7" width="3.5" height="13" rx="1" />
      <rect x="17.5" y="3" width="3.5" height="17" rx="1" />
    </svg>
  );
}

export function ArrowUpCircleIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16V8M8.5 11.5 12 8l3.5 3.5" />
    </Svg>
  );
}

export function ArrowDownCircleIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8.5 12.5 12 16l3.5-3.5" />
    </Svg>
  );
}

export function ScaleIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="9" />
      <line x1="7" y1="10" x2="17" y2="10" />
      <line x1="7" y1="14" x2="17" y2="14" />
    </Svg>
  );
}

export function ClockIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </Svg>
  );
}

export function BanknotesIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="2.5" y="6.5" width="19" height="11" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
    </Svg>
  );
}

export function CreditCardIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </Svg>
  );
}

export function HomeIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9a1 1 0 0 0 1 1h3v-5h4v5h3a1 1 0 0 0 1-1v-9" />
    </Svg>
  );
}

export function TagIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M3 12 12 3h6a3 3 0 0 1 3 3v6l-9 9-9-9Z" />
      <circle cx="15" cy="8" r="1.1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function CalendarDaysIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="8" y1="3" x2="8" y2="7" />
      <line x1="16" y1="3" x2="16" y2="7" />
    </Svg>
  );
}

export function ArrowPathIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 12a8 8 0 0 1 14-5.3" />
      <path d="M20 12a8 8 0 0 1-14 5.3" />
      <path d="M18 3.7v3h-3" />
      <path d="M6 20.3v-3h3" />
    </Svg>
  );
}

export function CheckCircleIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.3 10.5 15 16 9.3" strokeWidth={2} />
    </Svg>
  );
}

export function UserGroupIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <circle cx="17" cy="9" r="2.3" />
      <path d="M14.7 13.2a4.6 4.6 0 0 1 5.8 4.4" />
    </Svg>
  );
}

export function BellIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M6 8.5a6 6 0 1 1 12 0c0 3.3 1 5.3 1.6 6.2.35.5-.02 1.3-.63 1.3H5.03c-.6 0-.98-.8-.63-1.3C5 13.8 6 11.8 6 8.5Z" />
      <path d="M9.5 18.3a2.5 2.5 0 0 0 5 0" />
    </Svg>
  );
}

export function QuestionMarkCircleIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.3a2.5 2.5 0 1 1 3.6 2.25c-.8.4-1.1.95-1.1 1.75" strokeWidth={2} />
      <path d="M12 16.7h.01" strokeWidth={2.5} />
    </Svg>
  );
}
