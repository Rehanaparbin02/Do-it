// hooks/useRefresh.js
import { useState, useCallback } from "react";

/**
 * useRefresh - small reusable hook for pull-to-refresh that calls provided refreshers.
 *
 * @param {Array<Function>} refreshFns - array of async functions to invoke on refresh
 * @param {Array<any>} deps - dependency array for the callback (usually [user] or similar)
 * @returns {Object} { refreshing, onRefresh }
 */
export default function useRefresh(refreshFns = [], deps = []) {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      // Run all refresh functions in parallel and wait
      await Promise.all(
        refreshFns.map((fn) => {
          try {
            return (fn && typeof fn === "function") ? fn() : Promise.resolve();
          } catch (e) {
            return Promise.resolve();
          }
        })
      );
    } finally {
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps); // user provides deps so hook doesn't need to know specifics

  return { refreshing, onRefresh, setRefreshing };
}
