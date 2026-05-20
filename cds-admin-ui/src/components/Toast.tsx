export type ToastKind = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  kind: ToastKind;
  text: string;
}

export function ToastArea({ messages, onDismiss }: { messages: ToastMessage[]; onDismiss: (id: number) => void }) {
  return (
    <div className="toast-area" aria-live="polite" aria-relevant="additions removals">
      {messages.map((message) => (
        <div key={message.id} className={`toast toast-${message.kind}`} role={message.kind === 'error' ? 'alert' : 'status'}>
          <span>{message.text}</span>
          <button type="button" onClick={() => onDismiss(message.id)} aria-label="Dismiss message">
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
