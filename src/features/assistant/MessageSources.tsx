import type { AssistantSource } from './types';

type MessageSourcesProps = {
  sources?: AssistantSource[];
};

function MessageSources({ sources }: MessageSourcesProps) {
  if (!sources?.length) return null;

  return (
    <section className="luay-sources" aria-label="مصادر الرسالة">
      <h3>المصادر</h3>
      <ul>
        {sources.map((source) => (
          <li key={source.url}>
            <a href={source.url} target="_blank" rel="noreferrer noopener">
              <span>{source.title}</span>
              {source.official ? <span className="luay-source-badge">مصدر رسمي</span> : null}
              <span className="luay-source-arrow" aria-hidden="true">↗</span>
            </a>
          </li>
        ))}
      </ul>
      <p>افتح المصدر الأصلي للتحقق من المعلومات.</p>
    </section>
  );
}

export default MessageSources;
