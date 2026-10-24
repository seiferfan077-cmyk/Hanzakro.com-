import { Link } from 'react-router-dom';
import LuayAssistant from '../features/assistant/LuayAssistant';

function LuayChatPage() {
  return (
    <main className="chat-page-root" dir="rtl">
      <section className="chat-page-surface" aria-label="مساعد لؤي">
        <header className="chat-page-header">
          <Link className="chat-platform-back" to="/" aria-label="الرجوع إلى المنصة">
            <span aria-hidden="true">←</span>
            <span>الرجوع إلى المنصة</span>
          </Link>
          <div className="chat-page-brand" aria-label="هنذاكروا — مساعد لؤي">
            <span className="chat-page-brand-mark" aria-hidden="true">هـ</span>
            <span>هنذاكروا <span className="chat-brand-divider">/</span> مساعد لؤي</span>
          </div>
          <span className="chat-page-mode">معاينة الواجهة</span>
        </header>
        <LuayAssistant />
      </section>
    </main>
  );
}

export default LuayChatPage;
