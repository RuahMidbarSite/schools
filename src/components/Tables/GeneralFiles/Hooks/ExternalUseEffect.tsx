import { useEffect } from 'react';


/**
 * A custom hook that executes a callback function outside the main file when the component is mounted
 * or when the dependencies change. It also optionally runs a cleanup function
 * when the component is unmounted or before re-executing the effect.
 *
 * @param {() => void} callback - The function to be called on mount or dependency change.
 * @param {ReadonlyArray<any>} dependencies - List of dependencies that trigger the effect.
 * @param {() => void} [cleanupFunction=() => {}] - Optional cleanup function to run on unmount or before re-executing the effect.
 */
export const useExternalEffect = (
  callback: () => void,
  dependencies: ReadonlyArray<any>,
  cleanupFunction: () => void = () => {}
) => {
  useEffect(() => {
    
    callback();

    // Return the cleanup function
    return () => {
      cleanupFunction();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies); // Ensure dependencies is always an array literal
};