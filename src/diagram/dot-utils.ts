export function dotId(value: string): string {
  return quote(value);
}

export function dotString(value: string): string {
  return quote(value);
}

export function dotLabel(value: string): string {
  return `label=${dotString(value)}`;
}

export function dotXLabel(value: string): string {
  return `xlabel=${dotString(value)}`;
}

function quote(value: string): string {
  return `"${escapeDotString(value)}"`;
}

function escapeDotString(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r?\n/g, "\\n");
}
