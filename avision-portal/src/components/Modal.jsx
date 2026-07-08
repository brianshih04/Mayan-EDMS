import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

// Accessible modal built on a React portal. Focuses the first focusable element
// (put the non-destructive action first in DOM order), traps Tab/Shift+Tab,
// closes on Escape and backdrop click, locks body scroll while open, and restores
// focus on close. Restore target is the element that was focused when the modal
// opened (captured below) — `triggerRef`/`fallbackFocusRef` are fallbacks, since
// the trigger may be disabled by the time we close (e.g. the delete button is
// disabled while deletion runs and after the selection is cleared), and disabled
// controls can't receive focus.
function Modal({ open, onClose, titleId, descId, triggerRef, fallbackFocusRef, children }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    const dialog = dialogRef.current;
    if (dialog) {
      const focusable = dialog.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      (focusable || dialog).focus?.();
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      const primary = previouslyFocused || triggerRef?.current;
      if (primary && !primary.disabled && document.contains(primary)) {
        primary.focus?.();
        return;
      }
      const fallback = fallbackFocusRef?.current;
      if (fallback && document.contains(fallback)) {
        fallback.focus?.();
      }
    };
  }, [open, triggerRef, fallbackFocusRef]);

  if (!open) return null;

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const nodes = Array.from(
      dialog.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => !el.disabled);
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const active = document.activeElement;
    if (event.shiftKey) {
      if (active === first || !dialog.contains(active)) {
        event.preventDefault();
        last.focus();
      }
    } else if (active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div
        aria-describedby={descId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="modal-dialog"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

export default Modal;
