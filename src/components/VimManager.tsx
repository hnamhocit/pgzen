import { useEffect } from "react";
import { useVimStore } from "@/store/useVimStore";

function getFocusableElements() {
  const elements = Array.from(document.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )) as HTMLElement[];
  
  return elements.filter(el => {
     if (el.closest('.vim-ignore')) return false;
     
     // Ignore layout divs/spans that just have tabindex=0 for scrolling but aren't semantic widgets
     const tag = el.tagName.toLowerCase();
     if (tag === 'div' || tag === 'span') {
        const role = el.getAttribute('role');
        if (!role && el.tabIndex === 0) {
           return false;
        }
     }
     
     return true;
  });
}

function findNextElement(current: HTMLElement, direction: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight') {
  const elements = getFocusableElements().filter(el => {
     const rect = el.getBoundingClientRect();
     return rect.width > 0 && rect.height > 0 && el !== current && window.getComputedStyle(el).visibility !== 'hidden';
  });
  
  const currentRect = current.getBoundingClientRect();
  const currentCenter = {
    x: currentRect.left + currentRect.width / 2,
    y: currentRect.top + currentRect.height / 2
  };

  let bestElement: HTMLElement | null = null;
  let minDistance = Infinity;

  for (const el of elements) {
    const rect = el.getBoundingClientRect();
    const center = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };

    let dx = center.x - currentCenter.x;
    let dy = center.y - currentCenter.y;
    
    let isValid = false;
    switch (direction) {
       case 'ArrowUp': isValid = rect.bottom <= currentRect.top + 20; break;
       case 'ArrowDown': isValid = rect.top >= currentRect.bottom - 20; break;
       case 'ArrowLeft': isValid = rect.right <= currentRect.left + 20; break;
       case 'ArrowRight': isValid = rect.left >= currentRect.right - 20; break;
    }

    if (isValid) {
      let distance = 0;
      if (direction === 'ArrowUp' || direction === 'ArrowDown') {
         // Heavily penalize horizontal shift to keep movement straight
         distance = Math.abs(dy) + Math.abs(dx) * 10;
      } else {
         distance = Math.abs(dx) + Math.abs(dy) * 10;
      }

      if (distance < minDistance) {
        minDistance = distance;
        bestElement = el;
      }
    }
  }

  return bestElement;
}

let lastKey = "";

export function VimManager() {
  const { enabled, mode, setMode } = useVimStore();

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // System shortcuts
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) return;
      if (e.key === "t" && (e.metaKey || e.ctrlKey)) return;

      if (e.key === "Escape") {
        setMode("NORMAL");
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        return;
      }

      if (mode === "NORMAL") {
        if (e.key === ":" && e.shiftKey) {
          e.preventDefault();
          document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
          return;
        }

        if (e.key === "e" && lastKey === " ") {
          e.preventDefault();
          const treeEl = document.querySelector("[role='tree']") as HTMLElement;
          if (treeEl) {
             treeEl.focus();
             setTimeout(() => {
                if (!document.querySelector(".vim-tree-node-focused")) {
                   treeEl.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
                }
             }, 50);
          }
          return;
        }

        if (e.key === "i" || e.key === "a") {
          setMode("INSERT");
          e.preventDefault();
          return;
        }

        if (e.key === "Enter") {
           const tag = document.activeElement?.tagName;
           const isEditor = document.activeElement?.classList.contains("cm-content");
           
           if (tag === "INPUT" || tag === "TEXTAREA" || isEditor) {
              setMode("INSERT");
              e.preventDefault();
              return;
           }
           
           if (tag !== "TABLE") {
              e.preventDefault();
              (document.activeElement as HTMLElement).click();
           }
           // For TABLE, let Enter propagate natively
           return;
        }

        if (
          document.activeElement?.tagName === "INPUT" ||
          document.activeElement?.tagName === "TEXTAREA"
        ) {
          if (e.key.length === 1 && !["h", "j", "k", "l", " "].includes(e.key)) {
             e.preventDefault();
          }
        }
        
        // Block native arrow keys in NORMAL mode (only if triggered by real user input)
        if (e.isTrusted && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
           e.preventDefault();
           return;
        }

        const mapArrow: Record<string, "ArrowLeft"|"ArrowDown"|"ArrowUp"|"ArrowRight"> = { 
           h: "ArrowLeft", j: "ArrowDown", k: "ArrowUp", l: "ArrowRight" 
        };
        
        if (mapArrow[e.key]) {
           const arrowKey = mapArrow[e.key];
           e.stopPropagation();
           e.preventDefault();
           
           let activeEl = document.activeElement as HTMLElement | null;
           if (!activeEl || activeEl === document.body) {
              // Start from the middle if nothing is focused
              const dummy = document.createElement("div");
              dummy.style.position = "absolute";
              dummy.style.left = "50%";
              dummy.style.top = "50%";
              document.body.appendChild(dummy);
              const next = findNextElement(dummy, arrowKey);
              document.body.removeChild(dummy);
              if (next) {
                 e.preventDefault();
                 next.focus();
              }
           } else {
              // Try to dispatch event to active element first (let it handle native navigation)
              const event = new KeyboardEvent("keydown", { key: arrowKey, bubbles: true, cancelable: true });
              const handled = !activeEl.dispatchEvent(event);
              
              if (!handled) {
                 // Element didn't call preventDefault() - meaning it hit a boundary or doesn't support arrow navigation
                 e.preventDefault();
                 const next = findNextElement(activeEl, arrowKey);
                 if (next) {
                    next.focus();
                    
                    // Specific logic to trigger first-child focus if we jumped into a complex component
                    if (next.getAttribute("role") === "tree" && arrowKey === "ArrowLeft") {
                       setTimeout(() => {
                          if (!document.querySelector(".vim-tree-node-focused")) {
                             next.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
                          }
                       }, 50);
                    }
                 }
              } else {
                 e.preventDefault();
              }
           }
        }
        
        if (e.key.length === 1) lastKey = e.key;
        else lastKey = "";
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [mode, setMode]);

  return null;
}
