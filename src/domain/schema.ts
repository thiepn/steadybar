/** Small typed runtime validators, used at every persistence boundary. No coercion. */
export type Validator<T> = (input: unknown, path?: string) => T;
export class ValidationError extends Error { constructor(path: string, message: string) { super(`${path}: ${message}`); this.name = 'ValidationError'; } }
export const fail = (path: string, message: string): never => { throw new ValidationError(path, message); };
export const text = (max = 10000, min = 0): Validator<string> => (v, p = 'Value') => typeof v === 'string' && v.length >= min && v.length <= max ? v : fail(p, `expected text (${min}–${max} characters)`);
export const num = (min = 0, max = Number.MAX_SAFE_INTEGER, integer = false): Validator<number> => (v, p = 'Value') => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max && (!integer || Number.isInteger(v)) ? v : fail(p, `expected ${integer ? 'a whole number' : 'a number'} from ${min} to ${max}`);
export const bool: Validator<boolean> = (v,p = 'Value') => typeof v === 'boolean' ? v : fail(p, 'expected true or false');
export const one = <T extends string | number>(...items: T[]): Validator<T> => (v,p = 'Value') => items.includes(v as T) ? v as T : fail(p, `expected ${items.join(', ')}`);
export const optional = <T>(validator: Validator<T>): Validator<T | undefined> => (v,p) => v === undefined ? undefined : validator(v,p);
export const arr = <T>(validator: Validator<T>, max = 100000): Validator<T[]> => (v,p = 'Value') => Array.isArray(v) && v.length <= max ? v.map((x,i) => validator(x,`${p}[${i}]`)) : fail(p, `expected a list (maximum ${max} items)`);
export const obj = <S extends Record<string, Validator<unknown>>>(shape: S): Validator<{ [K in keyof S]: ReturnType<S[K]> }> => (v,p = 'Value') => {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return fail(p, 'expected an object');
  const source = v as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, validator] of Object.entries(shape)) {
    const result = validator(source[key], `${p}.${key}`);
    if (result !== undefined) out[key] = result;
  }
  return out as { [K in keyof S]: ReturnType<S[K]> };
};
export const iso: Validator<string> = (v,p = 'Date') => {
  if(typeof v!=='string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(v) || !Number.isFinite(Date.parse(v)))return fail(p,'expected an ISO timestamp with a timezone');
  dateOnly(v.slice(0,10),p);
  if(Number(v.slice(11,13))>23 || Number(v.slice(14,16))>59 || Number(v.slice(17,19))>59)return fail(p,'invalid clock time');
  return new Date(v).toISOString();
};
export const dateOnly: Validator<string> = (v,p = 'Date') => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return fail(p,'use YYYY-MM-DD');
  const date = new Date(`${v}T12:00:00`);
  if (!Number.isFinite(date.getTime()) || `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}` !== v) return fail(p,'invalid calendar date');
  return v;
};
export const id: Validator<string> = (v,p='ID') => {
  const value=text(120,1)(v,p);
  return /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value) ? value : fail(p,'use a route-safe identifier without spaces, slashes or URL control characters');
};
export const name: Validator<string> = (v,p='Name') => {
  const value=text(200,1)(v,p);
  return value.trim() ? value : fail(p,'cannot be blank');
};
export const bpm = num(20,300,true), order = num(0,10000,true);
export function uniqueIds(items:{id:string}[],p:string):void {
  if(new Set(items.map(item=>item.id)).size!==items.length)fail(p,'contains duplicate IDs; each item must be unique');
}
