type ConversationStarterProps = {
  onChoosePrompt: (prompt: string) => void;
};

const prompts = [
  'اشرح لي مفهومًا صعبًا بطريقة مبسطة',
  'ساعدني أراجع درسًا قبل الاختبار',
  'رتّب لي خطة مذاكرة قصيرة',
];

function ConversationStarter({ onChoosePrompt }: ConversationStarterProps) {
  return (
    <section className="luay-starter" aria-labelledby="luay-starter-title">
      <div className="luay-starter-mark" aria-hidden="true">ل</div>
      <p className="luay-starter-eyebrow">مساعد لؤي</p>
      <h2 id="luay-starter-title">أهلًا، أنا لؤي.</h2>
      <p className="luay-starter-copy">
        هذه واجهة أولية للمساعد. اختر فكرة لتجربة شكل المحادثة؛ لن يُرسل النص إلى خدمة ذكاء اصطناعي.
      </p>
      <div className="luay-prompts" aria-label="أمثلة لأسئلة">
        {prompts.map((prompt) => (
          <button key={prompt} type="button" onClick={() => onChoosePrompt(prompt)}>
            <span aria-hidden="true">↖</span>
            {prompt}
          </button>
        ))}
      </div>
    </section>
  );
}

export default ConversationStarter;
