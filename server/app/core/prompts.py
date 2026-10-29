import json
from pathlib import Path
from typing import Any, Dict

_PROMPTS_PATH = Path(__file__).parent / "prompts.json"

with open(_PROMPTS_PATH, "r", encoding="utf-8") as f:
    PROMPTS_CONFIG: Dict[str, Any] = json.load(f)

CHAT_SYSTEM_PROMPT: str = PROMPTS_CONFIG["prompts"]["chat_assistant"]["system_prompt"]


def get_prompt_section(key: str) -> Dict[str, str]:
    return PROMPTS_CONFIG["prompts"].get(key, {})


def render_prompt(key: str, **kwargs: Any) -> str:
    section = get_prompt_section(key)
    template = section.get("user_template") or section.get("user_prompt") or ""
    for k, v in kwargs.items():
        template = template.replace("{" + k + "}", str(v))
    return template
