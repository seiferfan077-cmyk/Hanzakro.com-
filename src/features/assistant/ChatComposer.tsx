import type { FormEvent, KeyboardEvent } from 'react';

type ChatComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

function ChatComposer({ value, onChange, onSubmit }: ChatComposerProps) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      onSubmit();
    }
  };

  return (
    <form className="luay-composer-wrap" onSubmit={submit}>
      <div className="luay-composer">
        <label className="visually-hidden" htmlFor="luay-message-input">اكتب رسالتك إلى لؤي</label>
        <textarea
          id="luay-message-input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={2000}
          rows={1}
          placeholder="اكتب سؤالًا لتجربة الواجهة المحلية…"
        />
        <button className="luay-send-button" type="submit" disabled={!value.trim()} aria-label="إضافة الرسالة إلى المعاينة المحلية">
          <span aria-hidden="true">↑</span>
        </button>
      </div>
      <div className="luay-composer-meta">
        <span>Enter للإضافة · Shift + Enter لسطر جديد</span>
        <span>{value.length} / 2000</span>
      </div>
    </form>
  );
}

export default ChatComposer;
