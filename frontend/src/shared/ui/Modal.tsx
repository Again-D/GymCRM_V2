import {
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef
} from "react";

import styles from "./Modal.module.css";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])"
].join(", ");

function getFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true"
  );
}

export function Modal({ isOpen, onClose, title, children, footer, size = "md" }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    previouslyFocusedElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    document.body.style.overflow = "hidden";

    const dialog = dialogRef.current;
    if (dialog) {
      const focusableElements = getFocusableElements(dialog);
      const initialTarget = focusableElements[0] ?? dialog;
      initialTarget.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const activeDialog = dialogRef.current;
      if (!activeDialog) {
        return;
      }

      const focusableElements = getFocusableElements(activeDialog);
      if (focusableElements.length === 0) {
        event.preventDefault();
        activeDialog.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocusedElementRef.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  function stopDialogPropagation(event: ReactKeyboardEvent | ReactMouseEvent) {
    event.stopPropagation();
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={`${styles.container} ${styles[size]}`}
        onClick={stopDialogPropagation}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        ref={dialogRef}
      >
        <header className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="모달 닫기"
          >
            &times;
          </button>
        </header>

        <main className={styles.content}>{children}</main>

        {footer ? <footer className={styles.footer}>{footer}</footer> : null}
      </div>
    </div>
  );
}
