import type { ReactNode } from "react";
import { FaTimes } from "react-icons/fa";

export interface ModalClassNames {
  backdrop?: string;
  modal?: string;
  header?: string;
  close?: string;
  errorBanner?: string;
}

const DEFAULT_CLASSES: Required<ModalClassNames> = {
  backdrop: "oa-modal-backdrop",
  modal: "oa-modal",
  header: "oa-modal-header",
  close: "oa-modal-close",
  errorBanner: "oa-error-banner",
};

interface ModalProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  error?: string | null;
  children: ReactNode;
  classNames?: ModalClassNames;
}

const Modal = ({ title, subtitle, onClose, error, children, classNames }: ModalProps) => {
  const c = { ...DEFAULT_CLASSES, ...classNames };

  return (
    <div className={c.backdrop} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={c.modal}>
        <div className={c.header}>
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className={c.close} onClick={onClose} aria-label="Close">
            <FaTimes />
          </button>
        </div>

        {error && <div className={c.errorBanner}>{error}</div>}

        {children}
      </div>
    </div>
  );
};

export default Modal;