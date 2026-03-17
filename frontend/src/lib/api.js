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
  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    const errorMessage = typeof data === 'object'
      ? (data?.message || data?.error || res.statusText)
      : res.statusText;
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
