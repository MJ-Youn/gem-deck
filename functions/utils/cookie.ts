export interface CookieSerializeOptions {
  domain?: string;
  encode?(val: string): string;
  expires?: Date;
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  priority?: 'low' | 'medium' | 'high';
  sameSite?: boolean | 'lax' | 'strict' | 'none';
  secure?: boolean;
}

export function parse(str: string): Record<string, string> {
  const obj: Record<string, string> = {};
  const pairs = str.split(';');

  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];
    let eqIdx = pair.indexOf('=');

    if (eqIdx === -1) {
      continue;
    }

    const key = pair.substring(0, eqIdx).trim();
    let val = pair.substring(eqIdx + 1, pair.length).trim();

    if (val[0] === '"') {
      val = val.slice(1, -1);
    }

    obj[key] = decodeURIComponent(val);
  }

  return obj;
}

export function serialize(name: string, val: string, options: CookieSerializeOptions = {}): string {
  const enc = options.encode || encodeURIComponent;
  let str = name + '=' + enc(val);

  if (options.maxAge !== undefined) {
    str += '; Max-Age=' + Math.floor(options.maxAge);
  }

  if (options.domain) {
    str += '; Domain=' + options.domain;
  }

  if (options.path) {
    str += '; Path=' + options.path;
  }

  if (options.expires) {
    str += '; Expires=' + options.expires.toUTCString();
  }

  if (options.httpOnly) {
    str += '; HttpOnly';
  }

  if (options.secure) {
    str += '; Secure';
  }

  if (options.priority) {
    str += '; Priority=' + options.priority;
  }

  if (options.sameSite) {
    const sameSite = typeof options.sameSite === 'string' ? options.sameSite.toLowerCase() : options.sameSite;
    switch (sameSite) {
      case true:
        str += '; SameSite=Strict';
        break;
      case 'lax':
        str += '; SameSite=Lax';
        break;
      case 'strict':
        str += '; SameSite=Strict';
        break;
      case 'none':
        str += '; SameSite=None';
        break;
    }
  }

  return str;
}
