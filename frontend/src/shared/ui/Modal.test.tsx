import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { Modal } from "./Modal";

describe("Modal", () => {
  afterEach(() => {
    cleanup();
    document.body.style.overflow = "";
  });

  it("exposes an accessible dialog and keeps the title relationship unique", () => {
    render(
      <Modal isOpen onClose={() => undefined} title="Locker Assignment">
        <button type="button">First action</button>
      </Modal>
    );

    const dialog = screen.getByRole("dialog", { name: "Locker Assignment" });

    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-labelledby")).toBeTruthy();
  });

  it("traps focus inside the modal and restores focus on close", () => {
    function Harness() {
      const [isOpen, setIsOpen] = useState(false);

      return (
        <div>
          <button type="button" onClick={() => setIsOpen(true)}>
            Open trigger
          </button>
          <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Reservation Create">
            <button type="button">Cancel</button>
            <button type="button">Confirm</button>
          </Modal>
        </div>
      );
    }

    render(<Harness />);

    const trigger = screen.getByRole("button", { name: "Open trigger" });
    trigger.focus();
    fireEvent.click(trigger);

    const closeButton = screen.getByRole("button", { name: "Close modal" });
    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    const confirmButton = screen.getByRole("button", { name: "Confirm" });

    expect(document.activeElement).toBe(closeButton);

    confirmButton.focus();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(document.activeElement).toBe(closeButton);

    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByRole("dialog", { name: "Reservation Create" })).toBeNull();
    expect(trigger).toBe(document.activeElement);
  });
});
