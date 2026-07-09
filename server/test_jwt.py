import sys
from jose import jwt
from app.core.config import settings

token = sys.argv[1] if len(sys.argv) > 1 else ""
if not token:
    print("No token provided")
    sys.exit(1)

print("Token:", token[:20] + "...")
try:
    unverified = jwt.get_unverified_header(token)
    print("Unverified header:", unverified)
except Exception as e:
    print("Error getting header:", e)

try:
    payload = jwt.decode(token, settings.supabase_jwt_secret, algorithms=["HS256", "RS256"])
    print("Decoded payload:", payload)
except Exception as e:
    print("Error decoding:", type(e), e)
