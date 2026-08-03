import { useEffect, useState } from 'react';

// Show a skeleton for a short beat on mount even when data is local/instant,
// so loading states feel consistent across the app.
export const useBriefLoad = (ms = 350) => {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return loading;
};
