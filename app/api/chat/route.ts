import {
  streamText,
  UIMessage,
  convertToModelMessages,
  tool,
  stepCountIs,
  TextUIPart,
} from 'ai';
import { z } from 'zod';
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const { messages, conversationId }: { messages: UIMessage[], conversationId?: string } = await req.json();

    if (!conversationId) {
      return Response.json({ error: "conversationId is required" }, { status: 400 });
    }

    // 1. 保存用户最新的一条消息
    const lastUserMessage = messages[messages.length - 1];
    if (lastUserMessage && lastUserMessage.role === Role.USER) {
      const content = lastUserMessage.parts
        .filter((part): part is TextUIPart => part.type === 'text')
        .map((part) => part.text)
        .join('');

      await prisma.message.create({
        data: {
          conversationId,
          role: Role.USER,
          content,
        },
      });
    }

    const result = streamText({
      model: "google/gemini-2.5-flash",
      messages: convertToModelMessages(messages),
      stopWhen: stepCountIs(5),
      tools: {
        weather: tool({
          description: 'Get the weather in a location (fahrenheit)',
          inputSchema: z.object({
            location: z.string().describe('The location to get the weather for'),
          }),
          execute: async ({ location }) => {
            const temperature = Math.round(Math.random() * (90 - 32) + 32);
            return {
              location,
              temperature,
            };
          },
        }),
        convertFahrenheitToCelsius: tool({
          description: 'Convert a temperature in fahrenheit to celsius',
          inputSchema: z.object({
            temperature: z
              .number()
              .describe('The temperature in fahrenheit to convert'),
          }),
          execute: async ({ temperature }) => {
            const celsius = Math.round((temperature - 32) * (5 / 9));
            return {
              celsius,
            };
          },
        }),
      },
      onFinish: async ({ text }) => {
        // 2. 保存 AI 的回复
        if (text) {
          await prisma.message.create({
            data: {
              conversationId,
              role: Role.ASSISTANT,
              content: text,
            },
          });
        }
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("POST /api/chat failed:", err);
    return Response.json(
      { error: message },
      { status: 500 }
    );
  }
}
