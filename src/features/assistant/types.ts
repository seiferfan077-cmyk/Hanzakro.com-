export type AssistantSource = {
  title: string;
  url: string;
  official?: boolean;
};

export type AssistantMessage = {
  id: string;
  role: 'user' | 'notice';
  text: string;
  sources?: AssistantSource[];
};
