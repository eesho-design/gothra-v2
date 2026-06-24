import time
import requests
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# Local hardware engine configuration
OLLAMA_API = "http://localhost:11434/api/generate"
MODEL_NAME = "qwen2.5-coder:7b"

class GothraV2SyncHandler(FileSystemEventHandler):
    def on_modified(self, event):
        # 1. COMPLETELY IGNORE node_modules, build directories, and git history
        if any(ignored in event.src_path for ignored in ["node_modules", "dist", ".git", "__pycache__"]):
            return
            
        # 2. Strict type scanning for your core Vite TypeScript and styles storefront code
        if event.is_directory or not event.src_path.endswith(('.ts', '.tsx', '.css', '.html', '.json')):
            return
        
        print(f"\n🔄 Component modified in gothra-v2: {event.src_path}")
        try:
            with open(event.src_path, 'r', encoding='utf-8') as f:
                code_content = f.read()
        except Exception:
            return

        # Tailored prompt strictly optimized for local web development debugging
        prompt = (
            f"You are evaluating a file from the gothra-v2 TypeScript e-commerce storefront.\n"
            f"Analyze this code carefully. Call out any TypeScript errors, state bugs, or logic flaws:\n\n"
            f"{code_content}"
        )
        
        try:
            response = requests.post(OLLAMA_API, json={"model": MODEL_NAME, "prompt": prompt, "stream": False})
            print("\n🤖 Qwen 2.5 Coder Review:")
            print(response.json().get("response"))
            print("=" * 60)
        except Exception as e:
            print(f"❌ Connection to local Ollama server failed: {e}")

if __name__ == "__main__":
    event_handler = GothraV2SyncHandler()
    observer = Observer()
    observer.schedule(event_handler, path=".", recursive=True)
    observer.start()
    print(f"🚀 High-Performance Dev Loop Active! Watching v2 source code using {MODEL_NAME}...")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()