// Iconografía compartida (SVG stroke, estilo lineal del design system).
// Único origen de verdad: landing, login y páginas importan de aquí.
const s = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export const IconBolt = (p) => (
  <svg viewBox="0 0 24 24" {...s} {...p}><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" /></svg>
);
export const IconFlow = (p) => (
  <svg viewBox="0 0 24 24" {...s} {...p}><circle cx="6" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><circle cx="18" cy="6" r="2.5" /><path d="M8.5 6H15M18 8.5v3.5a4 4 0 0 1-4 4H8.5" /></svg>
);
export const IconCal = (p) => (
  <svg viewBox="0 0 24 24" {...s} {...p}><rect x="3" y="4.5" width="18" height="16" rx="2.5" /><path d="M3 9h18M8 2.5v4M16 2.5v4" /></svg>
);
export const IconLayers = (p) => (
  <svg viewBox="0 0 24 24" {...s} {...p}><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /></svg>
);
export const IconShield = (p) => (
  <svg viewBox="0 0 24 24" {...s} {...p}><path d="M12 3 5 6v5c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></svg>
);
export const IconChart = (p) => (
  <svg viewBox="0 0 24 24" {...s} {...p}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>
);
export const IconLock = (p) => (
  <svg viewBox="0 0 24 24" {...s} {...p}><rect x="4.5" y="10.5" width="15" height="10" rx="2.5" /><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" /></svg>
);
export const IconUser = (p) => (
  <svg viewBox="0 0 24 24" {...s} {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
);
export const IconChat = (p) => (
  <svg viewBox="0 0 24 24" {...s} {...p}><path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12Z" /></svg>
);
export const IconSpark = (p) => (
  <svg viewBox="0 0 24 24" {...s} {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" /></svg>
);
export const IconCheck = (p) => (
  <svg viewBox="0 0 24 24" {...s} {...p}><path d="m5 13 4 4L19 7" /></svg>
);
export const IconArrowRight = (p) => (
  <svg viewBox="0 0 24 24" {...s} {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
export const IconArrowLeft = (p) => (
  <svg viewBox="0 0 24 24" {...s} {...p}><path d="M15 18l-6-6 6-6" /></svg>
);
export const IconMail = (p) => (
  <svg viewBox="0 0 24 24" {...s} {...p}><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m4 7 8 6 8-6" /></svg>
);
export const IconWhatsapp = (p) => (
  <svg viewBox="0 0 24 24" {...s} {...p}><path d="M21 12a8.5 8.5 0 0 1-12.5 7.5L3 21l1.6-5.3A8.5 8.5 0 1 1 21 12Z" /><path d="M8.5 9.5c0 3 2 5 5 5.5.7.1 1.2-.3 1.4-.9.1-.3 0-.6-.3-.8l-1.3-.7c-.3-.2-.6-.1-.8.1l-.3.4c-1-.4-1.7-1.1-2.1-2.1l.4-.3c.2-.2.3-.5.1-.8l-.7-1.3c-.2-.3-.5-.4-.8-.3-.6.2-1 .7-.9 1.4Z" /></svg>
);
export const IconChip = (p) => (
  <svg viewBox="0 0 24 24" {...s} {...p}><rect x="6" y="6" width="12" height="12" rx="2" /><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" /></svg>
);
export const IconBell = (p) => (
  <svg viewBox="0 0 24 24" {...s} {...p}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>
);
export const IconDashboard = (p) => (
  <svg viewBox="0 0 24 24" {...s} {...p}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>
);
export const IconBuilding = (p) => (
  <svg viewBox="0 0 24 24" {...s} {...p}><path d="M3 21h18" /><path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16" /><path d="M15 9h2a2 2 0 0 1 2 2v10" /><path d="M9 7h2M9 11h2M9 15h2" /></svg>
);
export const IconBuildings = (p) => (
  <svg viewBox="0 0 24 24" {...s} {...p}><path d="M3 21h18" /><path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16" /><path d="M15 9h4a1 1 0 0 1 1 1v11" /></svg>
);
export const IconMoney = (p) => (
  <svg viewBox="0 0 24 24" {...s} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v10M9.5 9.2c0-1 .9-1.7 2.5-1.7s2.5.7 2.5 1.8c0 2.4-5 1.3-5 3.6 0 1.1 1 1.8 2.5 1.8s2.5-.7 2.5-1.7" /></svg>
);
export const IconCalendar = (p) => (
  <svg viewBox="0 0 24 24" {...s} {...p}><rect x="3" y="4.5" width="18" height="16" rx="2.5" /><path d="M3 9h18M8 3v3M16 3v3" /></svg>
);
export const IconMenu = (p) => (
  <svg viewBox="0 0 24 24" {...s} {...p}><path d="M4 6h16M4 12h16M4 18h16" /></svg>
);
export const IconCheckBig = (p) => (
  <svg viewBox="0 0 24 24" {...s} {...p}><path d="M20 6 9 17l-5-5" /></svg>
);
export const IconCircleX = (p) => (
  <svg viewBox="0 0 24 24" {...s} {...p}><circle cx="12" cy="12" r="9" /><path d="M9 9l6 6M15 9l-6 6" /></svg>
);
export const IconChatSquare = (p) => (
  <svg viewBox="0 0 24 24" {...s} {...p}><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
);
