import re

with open("/opt/lachanso/server/services/riskEngineV2.js", "r", encoding="utf-8") as f:
    content = f.read()

lines = content.split("\n")
for i, line in enumerate(lines):
    if "const systemPrompt = " in line and "chuyên gia" in line:
        lines[i] = "        const systemPrompt = WEB_SYSTEM_PROMPT;"
        print(f"Replaced line {i+1}")
        break

with open("/opt/lachanso/server/services/riskEngineV2.js", "w", encoding="utf-8") as f:
    f.write("\n".join(lines))

print("Done")
