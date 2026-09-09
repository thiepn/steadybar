import type { Entity, RoutineBlock } from './models.js';
export const uuid = (): string => {
  if(crypto.randomUUID)return crypto.randomUUID();
  // Secure UUID v4 fallback for browser contexts without the randomUUID shortcut.
  const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]!&15)|64;bytes[8]=(bytes[8]!&63)|128;
  const hex=[...bytes].map(n=>n.toString(16).padStart(2,'0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
};
export const nowISO = (): string => new Date().toISOString();
export const advanceISO = (previous:string,now=Date.now()):string => new Date(Math.max(now,Date.parse(previous)+1)).toISOString();
export const metadata = (): Entity => { const now = nowISO(); return { id:uuid(), createdAt:now, updatedAt:now }; };
export const localDate = (input: Date | string = new Date()): string => {
  const d = typeof input === 'string' ? new Date(input) : input;
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
export function formatDate(input: string, detailed = false): string {
  const d = new Date(input.length === 10 ? `${input}T12:00:00` : input);
  return new Intl.DateTimeFormat(undefined, { month:'short', day:'numeric', ...(detailed ? { year:'numeric', hour:'2-digit', minute:'2-digit' } : {}) }).format(d);
}
export function duration(seconds: number, compact = false): string {
  if(seconds>0 && seconds<1)return compact?'<1s':'<1 sec';
  if(seconds < 60) return `${Math.floor(seconds)}${compact ? 's' : ' sec'}`;
  const minutes = Math.floor(seconds/60), hours = Math.floor(minutes/60);
  return hours ? `${hours}h ${minutes%60}m` : `${minutes}${compact ? 'm' : ' min'}`;
}
export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
}
export const clampBpm = (bpm: number): number => Math.min(300,Math.max(20,Math.round(bpm)));
export const titleCase = (text:string): string => text.replace(/(^|-)(\w)/g, (_,a:string,b:string) => (a ? ' ' : '') + b.toUpperCase());
export function reorder<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items];
  if(from < 0 || from >= items.length || to < 0 || to >= items.length) return next;
  const [moved] = next.splice(from,1);
  if(moved !== undefined) next.splice(to,0,moved);
  return next;
}
export const ordered = (blocks: RoutineBlock[]): RoutineBlock[] => blocks.map((block,order) => ({...block,order}));
export const freshBlocks = (blocks: RoutineBlock[]): RoutineBlock[] => blocks.map((block,order) => ({...structuredClone(block),id:uuid(),order}));
export function isoWeekStart(input = new Date()): Date {
  const date = new Date(input); date.setHours(0,0,0,0);
  date.setDate(date.getDate() - (date.getDay()+6)%7); return date;
}
export const errorMessage = (error: unknown): string => error instanceof Error ? error.message : 'The operation failed. Please retry.';
