import { useState, type FormEvent } from "react";
import { Send, ArrowUp } from "lucide-react";

// 负责渲染输入框的组件
export const MessageInput = ({
  onSend,
}: {
  onSend: (content: string) => void;
}) => {
  const [inputValue, setInputValue] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    onSend(inputValue);
    setInputValue("");
  };

  return (
    <div className="p-4 bg-white">
      <div className="max-w-3xl mx-auto">
        <div className="relative shadow-md rounded-2xl border border-gray-200 bg-white focus-within:ring-1 focus-within:ring-gray-300 focus-within:border-gray-300 transition-shadow">
          <form onSubmit={handleSubmit} className="flex flex-col">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Message SocraticU..."
              rows={1}
              className="w-full p-4 pr-12 bg-transparent border-none focus:ring-0 resize-none max-h-48 overflow-y-auto"
              style={{ minHeight: "60px" }}
            />
            
            <div className="absolute bottom-3 right-3">
              <button
                type="submit"
                disabled={!inputValue.trim()}
                className={`
                  p-2 rounded-lg transition-all duration-200
                  ${inputValue.trim() 
                    ? "bg-black text-white hover:bg-gray-800" 
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"}
                `}
              >
                <ArrowUp size={18} />
              </button>
            </div>
          </form>
        </div>
        
        <p className="text-center text-xs text-gray-400 mt-3">
          SocraticU can make mistakes. Please verify important information.
        </p>
      </div>
    </div>
  );
};
