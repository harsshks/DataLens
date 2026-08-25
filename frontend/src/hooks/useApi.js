import { useState, useCallback } from 'react';

export function useApi(fn) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(
    async (...args) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fn(...args);
        setData(res.data.data);
        return res.data.data;
      } catch (err) {
        const msg =
          err.response?.data?.error?.message ||
          err.message ||
          'Something went wrong';
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fn]
  );

  return { data, loading, error, execute };
}
