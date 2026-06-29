import os
import sys
import json
import asyncio
import subprocess
from pathlib import Path
from dotenv import load_dotenv

# Load local environment variables (.env) if present
load_dotenv()

# We need to make sure the virtual env packages are in sys.path
# so that crawl4ai and memanto SDK imports work perfectly.
VENV_PATH = Path(__file__).parent / ".venv" / "Lib" / "site-packages"
if VENV_PATH.exists():
    sys.path.insert(0, str(VENV_PATH))

from crawl4ai import AsyncWebCrawler
from memanto.cli.client.sdk_client import SdkClient

# Retrieve the Moorcheh API Key
API_KEY = os.environ.get("MOORCHEH_API_KEY")

# Check fallback to ~/.memanto/.env if not in local environment
if not API_KEY:
    home_env = Path.home() / ".memanto" / ".env"
    if home_env.exists():
        with open(home_env, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip().startswith("MOORCHEH_API_KEY="):
                    API_KEY = line.strip().split("=", 1)[1].replace('"', '').replace("'", "").strip()
                    os.environ["MOORCHEH_API_KEY"] = API_KEY
                    break

def get_sdk_client() -> SdkClient:
    """Initialize and return the Memanto SdkClient."""
    if not API_KEY:
        print("=" * 60)
        print("ERROR: MOORCHEH_API_KEY is not set.")
        print("Please set your API key by creating a free account at:")
        print("  https://console.moorcheh.ai")
        print()
        print("Then run this command to configure it:")
        print("  python crawl_and_memory.py --set-key YOUR_KEY")
        print("=" * 60)
        sys.exit(1)
    
    return SdkClient(API_KEY)

def parse_local_products() -> list:
    """Use node to cleanly parse and output the JS products array as JSON."""
    js_file = Path(__file__).parent / "frontend" / "src" / "products.js"
    if not js_file.exists():
        print(f"Warning: products.js not found at {js_file}")
        return []

    node_code = f"""
    const fs = require('fs');
    let content = fs.readFileSync('{js_file.as_posix()}', 'utf8');
    content = content.replace('export const PRODUCTS =', 'module.exports =');
    fs.writeFileSync('temp_products.js', content);
    try {{
        const products = require('./temp_products.js');
        console.log(JSON.stringify(products.PRODUCTS || products));
    }} catch (e) {{
        console.error(e);
    }} finally {{
        fs.unlinkSync('temp_products.js');
    }}
    """
    
    try:
        res = subprocess.run(
            ["node", "-e", node_code],
            capture_output=True,
            text=True,
            check=True
        )
        return json.loads(res.stdout.strip())
    except Exception as e:
        print(f"Failed to parse products.js using node: {e}")
        return []

async def crawl_gothra_pages() -> dict:
    """Crawl live Gothra pages using Crawl4AI."""
    pages = {
        "homepage": "https://gothra.org/",
        "about": "https://gothra.org/about",
        "contact": "https://gothra.org/contact",
        "shop": "https://gothra.org/shop"
    }
    
    results = {}
    print("\n[Crawl4AI] Starting crawl of gothra.org pages...")
    
    async with AsyncWebCrawler() as crawler:
        for name, url in pages.items():
            print(f"  Crawling {name} ({url})...")
            try:
                result = await crawler.arun(url=url)
                if result.success:
                    results[name] = result.markdown
                    print(f"  ✓ Scraped {name} ({len(result.markdown)} characters)")
                else:
                    print(f"  ✗ Failed to crawl {name}")
            except Exception as e:
                print(f"  ✗ Error crawling {name}: {e}")
                
    return results

def setup_agent_memory(agent_id="gothra", do_crawl=True, do_products=True):
    """Setup client, create agent, crawl page data, and save to Memanto."""
    client = get_sdk_client()
    
    # Step 1: Create the agent scenario if it doesn't exist
    print(f"\n[Memanto] Initializing memory for agent: '{agent_id}'...")
    try:
        # Check list of agents
        agents = client.list_agents()
        agent_exists = False
        for agent in agents:
            if agent.get("agent_id") == agent_id:
                agent_exists = True
                break
        
        if not agent_exists:
            print(f"  Creating agent '{agent_id}'...")
            client.create_agent(agent_id=agent_id, description="Gothra E-commerce Product Assistant Scenario")
        else:
            print(f"  Agent '{agent_id}' already exists.")
            
        # Step 2: Activate the agent to establish the session
        client.activate_agent(agent_id=agent_id)
        print(f"  ✓ Activated session for agent: {agent_id}")
        
    except Exception as e:
        print(f"Error during agent creation/activation: {e}")
        sys.exit(1)

    # Step 3: Crawl web pages using Crawl4AI and upload
    if do_crawl:
        web_content = asyncio.run(crawl_gothra_pages())
        print("\n[Memanto] Uploading crawled web content to agent memory...")
        for page_name, markdown in web_content.items():
            try:
                title = f"Gothra Website Page: {page_name.capitalize()}"
                client.remember(
                    agent_id=agent_id,
                    memory_type="fact",
                    title=title,
                    content=markdown,
                    tags=["website", page_name],
                    source="crawler"
                )
                print(f"  ✓ Stored {page_name} memory")
            except Exception as e:
                print(f"  ✗ Failed to store {page_name} memory: {e}")

    # Step 4: Parse local products and upload
    if do_products:
        print("\n[Memanto] Parsing local catalog...")
        products = parse_local_products()
        if products:
            print(f"  Found {len(products)} products in products.js. Uploading...")
            memories_batch = []
            for p in products:
                # Build rich product content details
                content = (
                    f"Product Name: {p['name']}\n"
                    f"Product ID: {p['id']}\n"
                    f"Category: {p.get('category', 'N/A')}\n"
                    f"Subcategory: {p.get('subcategory', 'N/A')}\n"
                    f"Price: INR {p.get('price', 0.0):,.2f}\n"
                    f"GST Rate: {p.get('gst_rate', 0)}%\n"
                    f"Description: {p.get('description', '')}"
                )
                memories_batch.append({
                    "title": f"Catalog Product: {p['name']}",
                    "content": content,
                    "type": "fact",
                    "tags": ["product", p.get("category", "all"), p.get("subcategory", "all")],
                    "source": "database"
                })
            
            try:
                result = client.batch_remember(agent_id=agent_id, memories=memories_batch)
                print(f"  ✓ Stored {result.get('successful', 0)}/{len(memories_batch)} products in memory")
            except Exception as e:
                print(f"  ✗ Failed to store batch product catalog: {e}")
        else:
            print("  No local products found or node parsing failed.")

    print(f"\n🎉 Gothra Memory Setup Completed successfully for agent '{agent_id}'!")

def search_memory(agent_id="gothra", query=""):
    """Recall/query agent memory."""
    client = get_sdk_client()
    client.activate_agent(agent_id=agent_id)
    
    print(f"\n[Memanto] Recalling memory for agent '{agent_id}' matching query: '{query}'...")
    try:
        results = client.recall(agent_id=agent_id, query=query)
        memories = results.get("memories", [])
        if not memories:
            print("  No matching memories found.")
            return
            
        print(f"  Found {len(memories)} matching memory results:")
        for idx, m in enumerate(memories, 1):
            print("-" * 50)
            print(f"[{idx}] {m.get('title', 'No Title')}")
            print(f"    Confidence: {m.get('similarity', 0.0):.2f}")
            print(f"    Content:\n{m.get('content', '')}")
        print("-" * 50)
    except Exception as e:
        print(f"Failed to query/recall memory: {e}")

if __name__ == "__main__":
    # Simple CLI argument routing
    args = sys.argv[1:]
    
    if "--set-key" in args:
        idx = args.index("--set-key")
        if idx + 1 < len(args):
            key = args[idx + 1]
            # Write to ~/.memanto/.env
            env_dir = Path.home() / ".memanto"
            env_dir.mkdir(parents=True, exist_ok=True)
            env_file = env_dir / ".env"
            with open(env_file, "w", encoding="utf-8") as f:
                f.write(f"MOORCHEH_API_KEY={key}\n")
            print(f"Moorcheh API Key successfully configured in {env_file}!")
            sys.exit(0)
            
    if "--search" in args:
        idx = args.index("--search")
        if idx + 1 < len(args):
            query = args[idx + 1]
            search_memory(query=query)
            sys.exit(0)
            
    # Default behavior: run complete setup
    setup_agent_memory()
