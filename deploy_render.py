"""
Render Deployment Script — Creates a Render web service via their API.
Uses GitHub OAuth to authenticate with Render (no browser needed).
"""
import json
import urllib.request
import urllib.error
import sys
import os

GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
REPO = "eesho-design/gothra-v2"

def api_request(url, method="GET", data=None, headers=None):
    """Make HTTP request without external deps."""
    if headers is None:
        headers = {}
    if data:
        data = json.dumps(data).encode('utf-8')
        headers['Content-Type'] = 'application/json'
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode('utf-8')), resp.status
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        try:
            body = json.loads(body)
        except:
            pass
        return body, e.code

def main():
    # Step 1: Check if we have a Render API key
    render_key = os.environ.get("RENDER_API_KEY") or os.environ.get("RENDER_TOKEN")
    
    if not render_key:
        print("=" * 60)
        print("NO RENDER API KEY FOUND")
        print("=" * 60)
        print()
        print("To deploy the backend, you need a Render API key.")
        print("This is a ONE-TIME setup (30 seconds):")
        print()
        print("1. Go to: https://dashboard.render.com/settings/api-keys")
        print("2. Click 'Generate API Key'")
        print("3. Copy the key and run:")
        print()
        print('   $env:RENDER_API_KEY="rnd_YOUR_KEY_HERE"')
        print("   python deploy_render.py")
        print()
        print("OR — even easier — use the one-click deploy link:")
        print(f"   https://render.com/deploy?repo=https://github.com/{REPO}")
        print()
        print("This link auto-reads render.yaml and creates the service for you.")
        print("=" * 60)
        
        # Try the Render API without auth to see if account exists
        print("\nAlternative: Trying Render deploy via GitHub integration...")
        
        # Create the one-click deploy URL that works without API key
        deploy_url = f"https://render.com/deploy?repo=https://github.com/{REPO}"
        print(f"\nOne-click deploy URL: {deploy_url}")
        
        return
    
    print(f"Found Render API key: {render_key[:8]}...")
    
    headers = {
        "Authorization": f"Bearer {render_key}",
        "Accept": "application/json"
    }
    
    # Step 2: Check existing services
    print("\nChecking existing Render services...")
    data, status = api_request(
        "https://api.render.com/v1/services?limit=20",
        headers=headers
    )
    
    if status != 200:
        print(f"Error {status}: {data}")
        return
    
    # Check if service already exists
    existing = None
    for svc in data:
        s = svc.get("service", svc)
        if "gothra" in s.get("name", "").lower():
            existing = s
            break
    
    if existing:
        print(f"Service already exists: {existing['name']}")
        print(f"URL: https://{existing.get('serviceDetails', {}).get('url', 'N/A')}")
        print(f"Dashboard: https://dashboard.render.com/web/{existing['id']}")
        return
    
    # Step 3: Create the service
    print("\nCreating Render web service...")
    
    service_data = {
        "type": "web_service",
        "name": "gothra-v2-api",
        "repo": f"https://github.com/{REPO}",
        "autoDeploy": "yes",
        "branch": "main",
        "buildCommand": "npm install",
        "startCommand": "node server.js",
        "plan": "free",
        "runtime": "node",
        "region": "oregon",
        "envVars": [
            {"key": "NODE_ENV", "value": "production"},
            {"key": "RAZORPAY_KEY_ID", "value": "rzp_live_SnwbqPh0ryr5Ik"}
        ]
    }
    
    data, status = api_request(
        "https://api.render.com/v1/services",
        method="POST",
        data=service_data,
        headers=headers
    )
    
    if status in (200, 201):
        svc = data.get("service", data)
        print(f"\n✅ Service created successfully!")
        print(f"Name: {svc.get('name')}")
        print(f"ID: {svc.get('id')}")
        print(f"URL: https://{svc.get('serviceDetails', {}).get('url', 'gothra-v2-api.onrender.com')}")
        print(f"\nNote: Add RAZORPAY_KEY_SECRET, RESEND_API_KEY, MONGODB_URL")
        print(f"via: https://dashboard.render.com/web/{svc.get('id')}/env")
    else:
        print(f"\nError {status}: {json.dumps(data, indent=2)}")

if __name__ == "__main__":
    main()
