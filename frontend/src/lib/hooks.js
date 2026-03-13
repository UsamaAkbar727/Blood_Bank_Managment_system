import { useCallback, useEffect, useRef, useState } from 'react';
import { request } from './api';

export function useAsync(fn, deps = [], { immediate = true, onError = () => {} } = {}) {
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fn(...args);
      setData(result);
      setLoading(false);
      return result;
    } catch (err) {
      setError(err);
      setLoading(false);
      onError(err);
      return null;
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (immediate) execute();
  }, [execute, immediate]);

  return { execute, loading, error, data, setData };
}

export function usePoller(callback, intervalMs, deps = []) {
  const savedCallback = useRef(callback);
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!intervalMs) return undefined;
    const id = setInterval(() => savedCallback.current(), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, ...deps]);
}

export function useApiResource(url, { initialData = [], interval = 0, transform = (x) => x, enabled = true } = {}) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState(null);
  const transformRef = useRef(transform);

  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const res = await request(url);
      const next = transformRef.current(res?.data ?? res);
      setData(next);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [url, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  usePoller(fetchData, interval, [url, interval, enabled]);

  return { data, loading, error, refetch: fetchData, setData };
}
