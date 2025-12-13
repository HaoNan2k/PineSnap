export const AssistantTypingIndicator = () => {
  return (
    <div className="flex gap-1.5">
      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
    </div>
  );
};
