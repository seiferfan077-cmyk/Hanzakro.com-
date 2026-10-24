import MessageSources from './MessageSources';
import type { AssistantMessage as AssistantMessageData } from './types';

type AssistantMessageProps = {
  message: AssistantMessageData;
};

function AssistantMessage({ message }: AssistantMessageProps) {
  const isUser = message.role === 'user';

  return (
    <article className={isUser ? 'luay-message luay-message-user' : 'luay-message luay-message-notice'}>
      <div className="luay-message-avatar" aria-hidden="true">{isUser ? 'أ' : 'ل'}</div>
      <div className="luay-message-content">
        <p className="luay-message-author">{isUser ? 'أنت' : 'حالة الواجهة'}</p>
        <div className="luay-message-bubble">
          <p>{message.text}</p>
          <MessageSources sources={message.sources} />
        </div>
      </div>
    </article>
  );
}

export default AssistantMessage;
