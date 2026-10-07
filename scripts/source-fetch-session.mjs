export function createSourceSession() {
  const cookies = new Map();
  return async (input, options = {}) => {
    const headers = new Headers(options.headers ?? {});
    if (cookies.size) headers.set("cookie", [...cookies].map(([name, value]) => `${name}=${value}`).join("; "));
    const response = await fetch(input, { ...options, headers });
    const setCookies = response.headers.getSetCookie?.() ?? [];
    for (const item of setCookies) {
      const pair = item.split(";", 1)[0];
      const separator = pair.indexOf("=");
      if (separator > 0) cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
    }
    return response;
  };
}
