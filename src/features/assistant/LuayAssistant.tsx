import { useEffect, useRef, useState } from 'react';
import AssistantMessage from './AssistantMessage';
import ChatComposer from './ChatComposer';
import ConversationStarter from './ConversationStarter';
import type { AssistantMessage as AssistantMessageData } from './types';

function LuayAssistant() {
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<AssistantMessageData[]>([]);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const transcript = transcriptRef.current;
    if (transcript) transcript.scrollTo({ top: transcript.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const text = draft.trim();
    if (!text) return;

    const stamp = Date.now();
    setMessages((current) => [
      ...current,
      { id: `user-${stamp}`, role: 'user', text },
      {
        id: `notice-${stamp}`,
        role: 'notice',
        text: 'أُضيفت الرسالة إلى المعاينة المحلية فقط. لم تُرسل إلى لؤي أو إلى أي خدمة خارجية، ولا يوجد رد ذكي متصل حاليًا.',
      },
    ]);
    setDraft('');
  };

  const handlePrompt = (prompt: string) => {
    setDraft(prompt);
    document.getElementById('luay-message-input')?.focus();
  };

  return (
    <section className="luay-assistant" aria-label="محادثة مساعد لؤي">
      <div className="luay-chat-panel">
        <header className="luay-chat-header">
          <div className="luay-avatar" aria-hidden="true">ل</div>
          <div className="luay-chat-title">
            <h1>لؤي</h1>
            <p>مساعد التعلّم</p>
          </div>
          <span className="luay-connection-state"><span className="luay-offline-dot" />واجهة غير متصلة</span>
        </header>

        <div className="luay-offline-notice" role="note">
          هذه معاينة للواجهة فقط. المحادثة لا تتصل بنموذج ذكاء اصطناعي ولا ترسل بياناتك.
        </div>

        <div className="luay-transcript" ref={transcriptRef} aria-live="polite" aria-relevant="additions text">
          {messages.length === 0 ? (
            <ConversationStarter onChoosePrompt={handlePrompt} />
          ) : (
            <div className="luay-message-list">
              {messages.map((message) => <AssistantMessage key={message.id} message={message} />)}
            </div>
          )}
          <div className="luay-transcript-end" aria-hidden="true" />
        </div>

        <button
          className="luay-jump-button"
          type="button"
          aria-label="الانتقال إلى أحدث الرسائل"
          onClick={() => transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: 'smooth' })}
        >
          <span aria-hidden="true">↓</span>
        </button>

        <ChatComposer value={draft} onChange={setDraft} onSubmit={handleSend} />
      </div>
    </section>
  );
}

export default LuayAssistant;
