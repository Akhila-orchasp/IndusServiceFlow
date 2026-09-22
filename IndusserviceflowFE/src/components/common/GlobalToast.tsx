import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import Toast from "./Toast";
import type { ToastType } from "./Toast";

export interface ShowToastOptions {
  message: string;
  type: ToastType;
  title?: string;
  duration?: number;
  delayMs?: number;
}

interface GlobalToastContextValue {
  showToast: (options: ShowToastOptions) => void;
}

const GlobalToastContext = createContext<GlobalToastContextValue | null>(null);

interface ActiveToast {
  id: number;
  message: string;
  type: ToastType;
  title?: string;
  duration: number;
}

export const GlobalToastProvider = ({ children }: { children: ReactNode }) => {
  const [active, setActive] = useState<ActiveToast | null>(null);
  const nextId = useRef(0);
  const delayTimer = useRef<number | null>(null);

  const showToast = useCallback((options: ShowToastOptions) => {
    if (delayTimer.current) {
      window.clearTimeout(delayTimer.current);
      delayTimer.current = null;
    }

    const fire = () => {
      nextId.current += 1;
      setActive({
        id: nextId.current,
        message: options.message,
        type: options.type,
        title: options.title,
        duration: options.duration ?? 4000,
      });
    };

    const delay = options.delayMs ?? 300;
    if (delay > 0) {
      delayTimer.current = window.setTimeout(fire, delay);
    } else {
      fire();
    }
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <GlobalToastContext.Provider value={value}>
      {children}
      {active && (
        <Toast
          key={active.id}
          message={active.message}
          type={active.type}
          title={active.title}
          duration={active.duration}
          onClose={() => setActive(null)}
        />
      )}
    </GlobalToastContext.Provider>
  );
};

export function useGlobalToast(): GlobalToastContextValue {
  const ctx = useContext(GlobalToastContext);
  if (!ctx) {
    throw new Error("useGlobalToast() must be used inside <GlobalToastProvider>.");
  }
  return ctx;
}