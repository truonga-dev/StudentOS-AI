import os
import re

api_dir = os.path.dirname(os.path.abspath(__file__))

def patch_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Update imports
    if "from app.core.supabase_client import get_supabase" in content:
        content = content.replace(
            "from app.core.supabase_client import get_supabase",
            "from app.core.supabase_client import get_supabase, get_user_supabase\nfrom supabase import Client"
        )
    
    # 2. Add `sb: Client = Depends(get_user_supabase)` to endpoint signatures
    content = content.replace(
        "user_id: str = Depends(get_user_id)\n):",
        "user_id: str = Depends(get_user_id),\n    sb: Client = Depends(get_user_supabase)\n):"
    )
    content = content.replace(
        "user_id: str = Depends(get_user_id)):",
        "user_id: str = Depends(get_user_id),\n    sb: Client = Depends(get_user_supabase)\n):"
    )

    # 3. Remove `sb = get_supabase()`
    content = re.sub(r'^[ \t]*sb\s*=\s*get_supabase\(\)[ \t]*\n', '', content, flags=re.MULTILINE)

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

for filename in os.listdir(api_dir):
    if filename.endswith(".py") and filename != "patch.py":
        patch_file(os.path.join(api_dir, filename))

print("Patch complete.")
