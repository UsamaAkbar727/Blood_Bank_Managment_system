export async function request(path, { method = 'GET', body, headers = {}, ...rest } = {}) {
  const init = {
    method,
    credentials: 'include',
    headers: {
      ...(body && { 'Content-Type': 'application/json' }),
      ...headers,
    },
    ...rest,
  };

  if (body && typeof body !== 'string') {
    init.body = JSON.stringify(body);
  } else if (body) {
    init.body = body;
  }

  const res = await fetch(path, init);

  if (res.status === 204 || res.status === 205) {
    return null;
  }

  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  const raw = await res.text();
  const hasBody = raw.trim() !== '';
  let data = null;

  if (hasBody) {
    if (contentType.includes('application/json')) {
      try {
        data = JSON.parse(raw);
      } catch (e) {
        data = raw;
      }
    } else {
      data = raw;
    }
  }

  if (!res.ok) {
    let errorMessage = res.statusText;
    if (data && typeof data === 'object') {
      errorMessage = data?.message || data?.error || res.statusText;
    } else if (typeof data === 'string' && data.trim()) {
      errorMessage = data.trim();
    }
    throw new Error(errorMessage || 'Request failed');
  }
  return data;
}

export const api = {
  login: (payload) => request('/api/auth/login.php', { method: 'POST', body: payload }),
  me: () => request('/api/auth/me.php'),
  logout: () => request('/api/auth/logout.php', { method: 'POST' }),
};

export function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '0';
  return new Intl.NumberFormat().format(value);
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0));
}

export function classNames(...values) {
  return values.filter(Boolean).join(' ');
}

export function timeAgo(dateString) {
  const date = new Date(dateString);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = item[key] ?? 'unknown';
    acc[k] = acc[k] || [];
    acc[k].push(item);
    return acc;
  }, {});
}
