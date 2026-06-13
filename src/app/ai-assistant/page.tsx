import AiChatBox from "@/components/AiChatBox";

export default function AiAssistantPage() {
  return (
    <div className="bg-transparent min-h-screen">
      <div className="bg-gradient-to-br from-navy-dark to-navy py-14 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-3xl font-bold sm:text-4xl">AI Assistant</h1>
          <p className="mt-3 max-w-2xl text-white/75">
            What is the smartest buying decision? Ask about suppliers, pricing, delivery, and timing.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <AiChatBox />
      </div>
    </div>
  );
}
