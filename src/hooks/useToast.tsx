"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

interface Toast {
  id: number;
  tone: "success" | "danger";
  message: string;
  leaving: boolean;
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (tone: Toast["tone"], message: string) => void;
  dismissToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextToastId = 0;

const DISPLAY_MS = 5000;
const EXIT_MS = 200;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Two-step dismiss: mark as leaving (so Toaster can play the exit
  // animation) then actually drop it from the list once that's had time to
  // play - matches EXIT_MS below.
  const dismissToast = useCallback((id: number) => {
    setToasts((current) =>
      current.map((toast) => (toast.id === id ? { ...toast, leaving: true } : toast)),
    );

    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, EXIT_MS);
  }, []);

  const showToast = useCallback(
    (tone: Toast["tone"], message: string) => {
      const id = nextToastId++;

      // New toast joins at the top of the stack, pushing older ones down.
      setToasts((current) => [{ id, tone, message, leaving: false }, ...current]);
      window.setTimeout(() => dismissToast(id), DISPLAY_MS);
    },
    [dismissToast],
  );

  const value = useMemo(
    () => ({ toasts, showToast, dismissToast }),
    [toasts, showToast, dismissToast],
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

function useToastContext() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast/useToastStack must be used within a ToastProvider");
  }

  return context;
}

// Call from mutation onSuccess/onError handlers to surface a transient banner.
export function useToast() {
  const { showToast } = useToastContext();

  return useMemo(
    () => ({
      success: (message: string) => showToast("success", message),
      error: (message: string) => showToast("danger", message),
    }),
    [showToast],
  );
}

// Consumed only by <Toaster> to render the current stack.
export function useToastStack() {
  const { toasts, dismissToast } = useToastContext();

  return { toasts, dismissToast };
}
