"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatContainerProps {
  messages: Message[];
  isLoading: boolean;
}

const ChatContainer = ({
  messages,
  isLoading,
}: ChatContainerProps) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-background">
      {messages.length === 0 && !isLoading && (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <p>Start an interview to begin</p>
        </div>
      )}

      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${
            message.isUser
              ? "justify-end"
              : "justify-start"
          }`}
        >
          <div
            className={`max-w-[90%] sm:max-w-[80%] lg:max-w-[70%] px-4 py-3 rounded-2xl ${
              message.isUser
                ? "bg-primary text-primary-foreground rounded-br-md"
                : "bg-muted text-foreground rounded-bl-md border border-border/50"
            }`}
          >
            {message.isUser ? (
              <p className="text-sm whitespace-pre-wrap break-words">
                {message.content}
              </p>
            ) : (
              <div className="text-sm leading-6 break-words">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => (
                      <p className="mb-3 last:mb-0">
                        {children}
                      </p>
                    ),

                    strong: ({ children }) => (
                      <strong className="font-bold">
                        {children}
                      </strong>
                    ),

                    ul: ({ children }) => (
                      <ul className="list-disc pl-5 mb-3 space-y-1">
                        {children}
                      </ul>
                    ),

                    ol: ({ children }) => (
                      <ol className="list-decimal pl-5 mb-3 space-y-1">
                        {children}
                      </ol>
                    ),

                    li: ({ children }) => (
                      <li>{children}</li>
                    ),

                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-primary/40 pl-4 my-3 text-muted-foreground">
                        {children}
                      </blockquote>
                    ),

                    code: ({
                      className,
                      children,
                    }) => {
                      const isBlock =
                        className?.includes(
                          "language-"
                        );

                      if (!isBlock) {
                        return (
                          <code className="px-1.5 py-0.5 rounded-md bg-background/70 border border-border/50 text-primary font-mono text-[13px]">
                            {children}
                          </code>
                        );
                      }

                      return (
                        <code className="block">
                          {children}
                        </code>
                      );
                    },

                    pre: ({ children }) => (
                      <pre className="my-3 overflow-x-auto rounded-xl bg-zinc-950 text-zinc-100 border border-zinc-800 p-4 text-[13px] leading-5 font-mono">
                        {children}
                      </pre>
                    ),

                    hr: () => (
                      <hr className="my-4 border-border" />
                    ),
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            )}

            <p
              className={`text-[10px] mt-2 ${
                message.isUser
                  ? "text-primary-foreground/60"
                  : "text-muted-foreground"
              }`}
            >
              {message.timestamp.toLocaleTimeString(
                [],
                {
                  hour: "2-digit",
                  minute: "2-digit",
                }
              )}
            </p>
          </div>
        </div>
      ))}

      {isLoading && (
        <div className="flex justify-start">
          <div className="bg-muted text-foreground px-4 py-3 rounded-2xl rounded-bl-md border border-border/50">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-primary rounded-full animate-bounce" />
              <span
                className="w-2 h-2 bg-primary rounded-full animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <span
                className="w-2 h-2 bg-primary rounded-full animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
              <span className="text-sm ml-1">
                AI is thinking...
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatContainer;