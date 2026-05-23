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

export function dotHtmlLabel(value: string): string {
  return `label=<${value}>`;
}

export function dotHtmlXLabel(value: string): string {
  return `xlabel=<${value}>`;
}

export function dotHtmlText(value: string): string {
  return escapeHtml(value);
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
