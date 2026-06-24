import asyncio
from langchain_openai import ChatOpenAI
from browser_use import Agent

# Create a tiny wrapper class to bypass browser-use's strict provider checking
class CompatibleChatOpenAI(ChatOpenAI):
    @property
    def provider(self) -> str:
        return "openai"

# Hook directly into your running Ollama engine using the patched class
llm = CompatibleChatOpenAI(
    base_url="http://localhost:11434/v1",
    api_key="ollama",
    model="qwen2.5-coder:7b"
)

async def main():
    agent = Agent(
        task="Open chromium, go to github.com/trending, look at the very first repository listed, and print its name in the terminal.",
        llm=llm,
    )
    result = await agent.run()
    print("\n🤖 Browser Use Result:")
    print(result)

if __name__ == "__main__":
    asyncio.run(main())