"use client";

import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface InputBoxProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function InputBox({
  onSend,
  disabled = false,
}: InputBoxProps) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    const message = input.trim();

    if (!message || disabled) {
      return;
    }

    onSend(message);
    setInput("");

    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-border bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex gap-2 items-center">
          <Input
            ref={inputRef}
            type="text"
            placeholder={
              disabled
                ? "AI is processing..."
                : "Type your answer..."
            }
            value={input}
            onChange={(event) =>
              setInput(event.target.value)
            }
            onKeyDown={handleKeyDown}
            disabled={disabled}
            autoComplete="off"
            className="flex-1 min-h-11"
          />

          <Button
            type="button"
            onClick={handleSend}
            disabled={
              disabled ||
              !input.trim()
            }
            className="min-h-11 px-6"
          >
            {disabled ? "..." : "Send"}
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground mt-2 text-center">
          Press Enter to send your answer
        </p>
      </div>
    </div>
  );
}