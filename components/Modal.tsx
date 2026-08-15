"use client";

import { useEffect, type ReactNode } from "react";
import { Icon } from "./Icon";

export function Modal({ title, eyebrow, children, onClose, width = "wide" }: {
  title: string;
  eyebrow: string;
  children: ReactNode;
  onClose: () => void;
  width?: "regular" | "wide";
}) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handler = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", handler);
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop">
      <button className="modal-dismiss-layer" aria-label="关闭弹窗" onClick={onClose} />
      <section className={`modal-card modal-${width}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <header className="modal-header">
          <div>
            <span className="eyebrow">{eyebrow}</span>
            <h2 id="modal-title">{title}</h2>
          </div>
          <button className="icon-button" aria-label="关闭" onClick={onClose}><Icon name="close" /></button>
        </header>
        {children}
      </section>
    </div>
  );
}
