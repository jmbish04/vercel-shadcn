import Markdown from "react-markdown";
import type { Components } from "react-markdown";
import { AnchorHTMLAttributes, DetailedHTMLProps, HTMLAttributes, useEffect, useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardContent, CardFooter, } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import WeatherCard from "@/components/weather-card";
import { cn } from "@/lib/utils";
import { useChat, type Message } from "@ai-sdk/react";
import { useEffect, useState } from "react";

const EMPTY_STATE_MESSAGE = `
# Welcome!

This is a chat application powered by:

- **[Vercel AI SDK](https://sdk.vercel.ai)** for managing the chat interface.
- **[Cloudflare Workers](https://workers.cloudflare.com)** for running the AI model.
- **Gemini, OpenAI, and Workers AI** as selectable language models.


Feel free to ask me anything!  I can answer questions, provide summaries, translate text, and more.
`;

const MarkdownComponents: Components = {
  a: (props: DetailedHTMLProps<AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement>) => (
    <a
      className="underline"
      {...props}
      target="_blank"
    />
  ),
  ul: (props: DetailedHTMLProps<HTMLAttributes<HTMLUListElement>, HTMLUListElement>) => <ul className="list-disc pl-6" {...props} />,
};

export default function Chat() {
  const [provider, setProvider] = useState("gemini");
  const [model, setModel] = useState("gemini-1.5-pro-latest");
  const [models, setModels] = useState<string[]>([]);

  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: "/api/chat",
    body: { provider, model },
  });
  const hasMessages = messages.length > 0;

  useEffect(() => {
    fetch(`/api/models?provider=${provider}`)
      .then((r) => r.json())
      .then((data) => {
        const models = data.models || [];
        setModels(models);
        if (models.length > 0) {
          setModel(models[0]);
        } else {
          setModel('');
        }
      })
      .catch((error) => {
        console.error(`Failed to fetch models for ${provider}:`, error);
        setModels([]);
        setModel('');
      });
  }, [provider]);

  return (
    <>
      <CardContent className="h-[400px] space-y-4">
        <ScrollArea className="h-full w-full">
          <div className="flex flex-col space-y-4">
            {hasMessages ? (
              messages.map((message: Message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex items-start gap-4 rounded-md p-2",
                    message.role === "user"
                      ? "bg-blue-50 text-blue-900"
                      : "bg-gray-50 text-gray-900"
                  )}
                >
                  <Avatar className="h-8 w-8">
                    {message.role === "user" ? (
                      <>
                        <AvatarImage src="https://github.com/kristianfreeman.png" />
                        <AvatarFallback>KF</AvatarFallback>
                      </>
                    ) : (
                      <Bot className="h-8 w-8" />
                    )}
                  </Avatar>
                  <div>
                    <p className="font-semibold mb-2">
                      {message.role === "user" ? "You" : provider.toUpperCase()}
                    </p>
                    <div className="space-y-2">
                      {message.content.startsWith('WEATHER:') ? (
                        <WeatherCard {...JSON.parse(message.content.replace('WEATHER:', ''))} />
                      ) : (
                        <Markdown components={MarkdownComponents}>
                          {message.content}
                        </Markdown>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-gray-500 h-full space-y-4">
                <Markdown components={MarkdownComponents}>
                  {EMPTY_STATE_MESSAGE}
                </Markdown>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <div className="flex space-x-2 w-full">
          <select value={provider} onChange={e => setProvider(e.target.value as any)} className="border px-2 py-1 rounded">
            <option value="gemini">Gemini</option>
            <option value="openai">OpenAI</option>
            <option value="assistant">OpenAI Assistant</option>
            <option value="workers">Workers AI</option>
          </select>
          <select value={model} onChange={e => setModel(e.target.value)} className="border px-2 py-1 rounded">
            {models.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <form onSubmit={handleSubmit} className="flex w-full space-x-2">
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="border rounded p-1"
          >
            <option value="gemini">Gemini</option>
            <option value="openai">OpenAI</option>
            <option value="cloudflare">Workers AI</option>
          </select>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="border rounded p-1"
          >
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <Input
            name="prompt"
            value={input}
            onChange={handleInputChange}
            placeholder="Type your message..."
            className="flex-1"
          />
          <input
            type="file"
            accept="audio/*"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const body = new FormData();
              body.append('file', file);
              const res = await fetch('/api/transcribe', { method: 'POST', body });
              const data = await res.json();
              if (data.text) setInput(data.text);
            }}
          />
          <Button type="submit">Send</Button>
        </form>
      </CardFooter>
    </>
  )
}
