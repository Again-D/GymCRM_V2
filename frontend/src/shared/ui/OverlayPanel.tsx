import { type ReactNode, useEffect } from "react";

type OverlayPanelProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  actions?: ReactNode;
  children: ReactNode;
};

export function OverlayPanel({ open, title, onClose, actions, children }: OverlayPanelProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="overlay-panel-backdrop" role="presentation" onClick={onClose}>
      <section
        className="overlay-panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="overlay-panel-header">
          <h3>{title}</h3>
          <div className="overlay-panel-header-actions">
            {actions}
            <button type="button" className="secondary-button" onClick={onClose}>
              닫기
            </button>
          </div>
        </header>
        <div className="overlay-panel-body">{children}</div>
      </section>
    </div>
  );
}
