/**
 * Keyboard shortcuts hook
 */
import { useEffect } from 'react';

/**
 * @param {Object} shortcuts - Map of shortcut keys to handlers
 * Format: { 'ctrl+enter': handler, 'ctrl+s': handler, 'escape': handler }
 */
export function useKeyboardShortcuts(shortcuts) {
    useEffect(() => {
        function handleKeyDown(e) {
            const key = e.key.toLowerCase();
            const ctrl = e.ctrlKey || e.metaKey;
            const shift = e.shiftKey;

            let combo = '';
            if (ctrl) combo += 'ctrl+';
            if (shift) combo += 'shift+';
            combo += key;

            const handler = shortcuts[combo];
            if (handler) {
                const shouldPreventDefault = handler(e);
                if (shouldPreventDefault !== false) {
                    e.preventDefault();
                }
            }
        }

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [shortcuts]);
}

export default useKeyboardShortcuts;
