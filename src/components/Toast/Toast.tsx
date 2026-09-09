import { useEffect } from 'react';

interface ToastProps {
  message: string;
  onDismiss: () => void;
  durationMs?: number;
}

export function Toast({ message, onDismiss, durationMs = 3200 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);

  return (
    <div className="toast" onClick={onDismiss}>
      {message}
    </div>
  );
}
