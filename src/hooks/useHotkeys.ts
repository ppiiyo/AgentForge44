import { useEffect, useRef } from 'react';

type HotkeyHandler = (keyboardEvent: KeyboardEvent) => void;

interface HotkeyDefinition {
  key: string; // e.g. 's', 'Enter', 'Delete', 'Backspace', 'Escape'
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: HotkeyHandler;
}

export function useHotkeys(definitions: HotkeyDefinition[], dependencies: any[] = []) {
  const definitionsRef = useRef<HotkeyDefinition[]>(definitions);

  useEffect(() => {
    definitionsRef.current = definitions;
  }, [definitions]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Avoid triggering hotkeys when working inside text inputs or textareas
      const activeElement = document.activeElement;
      if (activeElement) {
        const tagName = activeElement.tagName.toLowerCase();
        const contentEditable = activeElement.getAttribute('contenteditable');
        if (
          tagName === 'input' || 
          tagName === 'textarea' || 
          contentEditable === 'true' || 
          contentEditable === ''
        ) {
          // If Backspace/Delete/Escape is pressed, let's allow it for inputs
          return;
        }
      }

      for (const def of definitionsRef.current) {
        const keyMatch = event.key.toLowerCase() === def.key.toLowerCase();
        
        const ctrlMatch = def.ctrl === undefined || def.ctrl === (event.ctrlKey || event.metaKey);
        const metaMatch = def.meta === undefined || def.meta === event.metaKey;
        const shiftMatch = def.shift === undefined || def.shift === event.shiftKey;
        const altMatch = def.alt === undefined || def.alt === event.altKey;

        if (keyMatch && ctrlMatch && metaMatch && shiftMatch && altMatch) {
          event.preventDefault();
          def.handler(event);
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, dependencies);
}
