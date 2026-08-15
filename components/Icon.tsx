import type { SVGProps } from "react";

export type IconName =
  | "plaza" | "check" | "plus" | "terminal" | "wallet" | "search" | "key"
  | "lock" | "code" | "owl" | "settings" | "users" | "clock" | "pool"
  | "trend" | "copy" | "arrow" | "shield" | "spark" | "close" | "globe"
  | "link" | "activity" | "external" | "menu" | "warning" | "chevron";

const paths: Record<IconName, React.ReactNode> = {
  plaza: <><circle cx="7" cy="7" r="2.4"/><circle cx="17" cy="7" r="2.4"/><circle cx="12" cy="17" r="2.4"/><path d="M8.9 8.5l2 6M15.1 8.5l-2 6M9.3 7h5.4"/></>,
  check: <><path d="M4 12.5l5 5L20 6"/><path d="M20 12a8 8 0 1 1-4.8-7.3"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  terminal: <><path d="M4 6l5 5-5 5M11 18h9"/><rect x="2" y="3" width="20" height="18"/></>,
  wallet: <><path d="M3 7h16a2 2 0 0 1 2 2v10H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14v4"/><path d="M16 12h5"/></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/></>,
  key: <><circle cx="7" cy="15" r="4"/><path d="M10 12l10-10M16 6l3 3M13 9l3 3"/></>,
  lock: <><rect x="4" y="10" width="16" height="11"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></>,
  code: <><path d="M8 8l-4 4 4 4M16 8l4 4-4 4M14 4l-4 16"/></>,
  owl: <><path d="M5 8l-2-4 5 2a9 9 0 0 1 8 0l5-2-2 4v6a7 7 0 0 1-14 0z"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><path d="M10 16h4"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19 13.5l2 1.5-2 3.5-2.4-1a8 8 0 0 1-2.6 1.5L13.5 22h-4L9 19a8 8 0 0 1-2.6-1.5l-2.4 1L2 15l2-1.5a8 8 0 0 1 0-3L2 9l2-3.5 2.4 1A8 8 0 0 1 9 5l.5-3h4l.5 3a8 8 0 0 1 2.6 1.5l2.4-1L21 9l-2 1.5a8 8 0 0 1 0 3z"/></>,
  users: <><circle cx="9" cy="8" r="3"/><circle cx="18" cy="9" r="2"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M15 14a5 5 0 0 1 6 4v2"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/></>,
  pool: <><path d="M3 19h18M5 15h14M7 11h10M9 7h6M11 3h2"/></>,
  trend: <><path d="M3 18l6-6 4 4 8-10"/><path d="M16 6h5v5"/></>,
  copy: <><rect x="8" y="8" width="12" height="12"/><path d="M16 8V4H4v12h4"/></>,
  arrow: <><path d="M5 12h14M14 6l6 6-6 6"/></>,
  shield: <path d="M12 2l8 3v6c0 5-3.4 9-8 11-4.6-2-8-6-8-11V5z"/>,
  spark: <><path d="M12 2l1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7z"/><path d="M19 17l.8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8z"/></>,
  close: <path d="M5 5l14 14M19 5L5 19"/>,
  globe: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></>,
  link: <><path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1-1"/></>,
  activity: <path d="M3 12h4l2-6 4 12 2-6h6"/>,
  external: <><path d="M14 3h7v7M21 3l-9 9"/><path d="M18 13v8H3V6h8"/></>,
  menu: <path d="M3 6h18M3 12h18M3 18h18"/>,
  warning: <><path d="M12 3L2 21h20z"/><path d="M12 9v5M12 18h.01"/></>,
  chevron: <path d="M8 10l4 4 4-4"/>,
};

export function Icon({ name, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" {...props}>
      {paths[name]}
    </svg>
  );
}
