const SCRIPT_RE = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi
const EVENT_RE  = /\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi
const JS_HREF   = /href\s*=\s*["']?\s*javascript:[^"'\s>]*/gi
const DATA_SRC  = /src\s*=\s*["']\s*data:[^"']*["']/gi
const IFRAME_RE = /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi
const EMBED_RE  = /<(?:object|embed)\b[^>]*>/gi

export function sanitizeHtml(html: string): string {
  return html
    .replace(SCRIPT_RE, '')
    .replace(EVENT_RE,  '')
    .replace(JS_HREF,   'href="#"')
    .replace(DATA_SRC,  '')
    .replace(IFRAME_RE, '')
    .replace(EMBED_RE,  '')
}
