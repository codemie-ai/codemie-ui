"""EPMCDME-8561 - proof that the dropzone announces the added/removed file by name.

Announcements are read from Chrome's accessibility tree (role=status nodes) over the
DevTools Protocol, not from DOM textContent: a live region inside an aria-hidden or
inert subtree still carries text in the DOM while being invisible to assistive
technology, which would be a false green.

Usage:
    CODEMIE_UI_URL=http://localhost:5173 \
    CODEMIE_API_URL=http://localhost:8080 \
    CODEMIE_USER=<user> CODEMIE_PASSWORD=<password> \
    uv run --with playwright python verify-announcement.py ./out
"""

import base64
import json
import os
import pathlib
import re
import sys
import time
import urllib.request

from playwright.sync_api import sync_playwright

UI_URL = os.environ.get("CODEMIE_UI_URL", "http://localhost:5173")
API_URL = os.environ.get("CODEMIE_API_URL", "http://localhost:8080")
USER = os.environ.get("CODEMIE_USER")
PASSWORD = os.environ.get("CODEMIE_PASSWORD")
OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "./out")

if not USER or not PASSWORD:
    sys.exit("Set CODEMIE_USER and CODEMIE_PASSWORD for the local environment.")


def login() -> tuple[str, str]:
    """Return an access token and the user id it was issued for."""
    request = urllib.request.Request(
        f"{API_URL}/v1/local-auth/login",
        data=json.dumps({"email": USER, "password": PASSWORD}).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request) as response:
        token = json.loads(response.read())["access_token"]
    claims = token.split(".")[1]
    claims += "=" * (-len(claims) % 4)
    return token, json.loads(base64.urlsafe_b64decode(claims))["sub"]


def live_region_state(page):
    """Report whether the live region is actually exposed to assistive technology."""
    return page.evaluate("""() => {
      const el = document.querySelector('output[aria-live]')
      if (!el) return {present: false}
      let hidden = null
      for (let node = el; node; node = node.parentElement) {
        const isHidden = node.getAttribute
          && (node.getAttribute('aria-hidden') === 'true' || node.hasAttribute('inert'))
        if (isHidden) { hidden = node.tagName + (node.id ? '#' + node.id : ''); break }
      }
      const style = getComputedStyle(el)
      return {
        present: true,
        role: el.getAttribute('role') || el.tagName.toLowerCase(),
        ariaLive: el.getAttribute('aria-live'),
        ariaAtomic: el.getAttribute('aria-atomic'),
        hiddenBy: hidden,
        display: style.display,
        visibility: style.visibility,
      }
    }""")


def node_text(node, by_id) -> str:
    """Concatenate a node's accessible name with the names of its descendants."""
    parts = [node.get("name", {}).get("value") or ""]
    children = (by_id.get(child_id) for child_id in node.get("childIds", []) or [])
    parts.extend(node_text(child, by_id) for child in children if child)

    return " ".join(part.strip() for part in parts if part.strip())


def ax_status_texts(cdp) -> list[str]:
    """Read the text of every role=status node in the accessibility tree."""
    nodes = cdp.send("Accessibility.getFullAXTree")["nodes"]
    by_id = {node["nodeId"]: node for node in nodes}
    status_nodes = (n for n in nodes if n.get("role", {}).get("value") == "status")

    return [text for text in (node_text(n, by_id) for n in status_nodes) if text]


def poll_announcements(cdp, seconds=5.0) -> list[str]:
    """The queue blanks the region between messages, so sample it repeatedly."""
    seen: list[str] = []
    deadline = time.time() + seconds
    while time.time() < deadline:
        for text in ax_status_texts(cdp):
            if text not in seen:
                seen.append(text)
        time.sleep(0.12)
    return seen


def open_file_datasource_form(page, user_id):
    visited = json.dumps(["chat", "assistants", "workflows", "integrations", "datasources"])
    page.context.add_init_script(
        f"localStorage.setItem('codemie-onboarding-completed', 'true');"
        f"localStorage.setItem('{user_id}_onboarding-visited-pages', '{visited}');"
    )
    page.goto(f"{UI_URL}/#/data-sources", wait_until="networkidle")
    time.sleep(2)
    page.get_by_role("button", name="Create Datasource").first.click()
    time.sleep(2)
    type_input = page.locator("#indexType input").first
    type_input.click()
    type_input.press("Meta+a")
    type_input.type("File", delay=60)
    time.sleep(1.2)
    page.locator("li[role='option']").filter(has_text=re.compile(r"^File$")).first.click()
    time.sleep(1.5)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    sample = OUT / "quarterly-report.pdf"
    sample.write_bytes(b"%PDF-1.4\n% EPMCDME-8561 evidence sample\n")
    token, user_id = login()

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        context.add_cookies([{
            "name": "codemie_access_token", "value": token, "domain": "localhost",
            "path": "/", "httpOnly": False, "secure": False, "sameSite": "Lax",
        }])
        page = context.new_page()
        cdp = context.new_cdp_session(page)
        cdp.send("Accessibility.enable")

        open_file_datasource_form(page, user_id)
        before = live_region_state(page)

        page.set_input_files("input[aria-label='Select files to upload']", str(sample))
        on_add = poll_announcements(cdp)
        page.screenshot(path=str(OUT / "file-added.png"))

        page.locator("button[aria-label*='emove']").first.click()
        on_remove = poll_announcements(cdp)

        json.dump(
            {"live_region": before, "announced_on_add": on_add, "announced_on_remove": on_remove},
            (OUT / "ax-evidence.json").open("w"),
            indent=2,
        )
        print("announced on add:   ", on_add)
        print("announced on remove:", on_remove)
        browser.close()


if __name__ == "__main__":
    main()
