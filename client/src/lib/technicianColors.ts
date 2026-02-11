import type { Technician } from "@shared/schema";

const TECH_COLOR_PALETTE = [
  "#C62828",
  "#E65100",
  "#B8860B",
  "#2E7D32",
  "#1565C0",
  "#6A1B9A",
  "#00838F",
  "#AD1457",
  "#4E342E",
  "#37474F",
  "#558B2F",
  "#D84315",
];

export function getTechColor(technician: Technician | undefined | null, index?: number): string {
  if (!technician) return "#6B7280";
  if (technician.color) return technician.color;
  const idx = index ?? hashStringToIndex(technician.id, TECH_COLOR_PALETTE.length);
  return TECH_COLOR_PALETTE[idx % TECH_COLOR_PALETTE.length];
}

export function getTechColorById(techId: string | null | undefined, technicians: Technician[]): string {
  if (!techId) return "#6B7280";
  const tech = technicians.find(t => t.id === techId);
  if (!tech) return "#6B7280";
  const index = technicians.indexOf(tech);
  return getTechColor(tech, index);
}

export function getTechInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function hashStringToIndex(str: string, mod: number): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % mod;
}
