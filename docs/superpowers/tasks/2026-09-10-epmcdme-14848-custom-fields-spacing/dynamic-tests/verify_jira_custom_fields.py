"""EPMCDME-14848 - browser verification of Custom fields (optional) chip spacing."""
import json, sys
from playwright.sync_api import sync_playwright

URL = "http://localhost:5199/verify-jira-fields.html"
SHOTS = sys.argv[1]
FIX_CLASSES = ["!h-auto", "!max-h-none", "min-h-11",
               "[&_.p-multiselect-label]:!py-1.5",
               "[&_.p-multiselect-label]:!overflow-visible",
               "[&_.p-multiselect-label]:!whitespace-normal",
               "[&_.p-multiselect-label]:!gap-2"]

FIELDS = [
    {"id": "customfield_10001", "name": "Story Points"},
    {"id": "customfield_10002", "name": "Epic Link"},
    {"id": "customfield_10003", "name": "Sprint"},
    {"id": "customfield_10004", "name": "Acceptance Criteria"},
    {"id": "customfield_10005", "name": "Team"},
    {"id": "customfield_10006", "name": "Severity"},
    {"id": "customfield_10007", "name": "Root Cause Analysis"},
    {"id": "customfield_10008", "name": "QA Owner"},
]

MEASURE = """() => {
  const root = document.querySelector('#jiraCustomFields') || document.querySelector('.p-multiselect');
  const ms = root.closest('.p-multiselect') || root;
  const label = ms.querySelector('.p-multiselect-label');
  // The app's `pt` preset replaces PrimeReact's .p-multiselect-token class, so chips are
  // the direct <span> children of the label rather than .p-multiselect-token nodes.
  const chips = [...label.children].filter(e => e.tagName === 'SPAN');
  const cs = getComputedStyle(ms), ls = getComputedStyle(label);
  const box = (e) => { const r = e.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height,top:r.top,bottom:r.bottom,left:r.left,right:r.right}; };
  const chipBoxes = chips.map(c => ({...box(c), text: c.innerText.trim()}));
  // group chips into rows by y centre
  const rows = [];
  chipBoxes.forEach(c => {
    const cy = c.y + c.h/2;
    let row = rows.find(r => Math.abs(r.cy - cy) < c.h/2);
    if (!row) { row = {cy, items: []}; rows.push(row); }
    row.items.push(c);
  });
  rows.sort((a,b)=>a.cy-b.cy);
  rows.forEach(r => r.items.sort((a,b)=>a.x-b.x));
  // horizontal gaps within a row
  const hGaps = [];
  rows.forEach(r => { for (let i=1;i<r.items.length;i++) hGaps.push(+(r.items[i].left - r.items[i-1].right).toFixed(2)); });
  // vertical gaps between rows
  const vGaps = [];
  for (let i=1;i<rows.length;i++) {
    const prevBottom = Math.max(...rows[i-1].items.map(c=>c.bottom));
    const curTop = Math.min(...rows[i].items.map(c=>c.top));
    vGaps.push(+(curTop - prevBottom).toFixed(2));
  }
  const msBox = box(ms);
  // clipping: any chip outside the control's painted box, or label overflowing
  const clippedChips = chipBoxes.filter(c => c.bottom > msBox.bottom + 0.5 || c.top < msBox.top - 0.5).map(c=>c.text);
  const embeddings = document.querySelector('[data-testid="embeddings-field"]');
  const wrapper = document.querySelector('[data-testid="custom-fields-wrapper"]');
  const cfLabel = wrapper.querySelector('label');
  const gapAbove = +(box(cfLabel).top - box(embeddings).bottom).toFixed(2);
  const nextField = document.querySelector('[data-testid="next-field"]');
  const gapBelow = +(box(nextField).top - box(wrapper).bottom + 0).toFixed(2);
  return {
    control: msBox,
    controlScrollHeight: ms.scrollHeight, controlClientHeight: ms.clientHeight,
    labelScrollHeight: label.scrollHeight, labelClientHeight: label.clientHeight,
    computed: { msHeight: cs.height, msMaxHeight: cs.maxHeight, msMinHeight: cs.minHeight,
                labelDisplay: ls.display, labelGap: ls.gap, labelColumnGap: ls.columnGap, labelRowGap: ls.rowGap,
                labelWhiteSpace: ls.whiteSpace, labelOverflow: ls.overflow,
                labelPaddingTop: ls.paddingTop, labelPaddingBottom: ls.paddingBottom },
    chipCount: chipBoxes.length, rowCount: rows.length,
    minHGap: hGaps.length ? Math.min(...hGaps) : null, hGaps,
    minVGap: vGaps.length ? Math.min(...vGaps) : null, vGaps,
    clippedChips,
    labelOverflowing: label.scrollHeight > label.clientHeight + 1,
    controlOverflowing: ms.scrollHeight > ms.clientHeight + 1,
    gapAbove, gapBelow,
  };
}"""

def run():
    out = {"console_errors": [], "network_failures": [], "modes": {}}
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 900, "height": 900}, device_scale_factor=2)
        page.on("console", lambda m: out["console_errors"].append(f"{m.type}: {m.text}") if m.type == "error" else None)
        page.on("pageerror", lambda e: out["console_errors"].append(f"pageerror: {e}"))
        page.on("response", lambda r: out["network_failures"].append(f"{r.status} {r.url}") if r.status >= 400 else None)
        page.route("**/v1/index/jira/fields*", lambda route: route.fulfill(
            status=200, content_type="application/json", body=json.dumps(FIELDS)))

        page.goto(URL, wait_until="networkidle")
        page.wait_for_selector(".p-multiselect", timeout=15000)
        # open dropdown and pick every field so chips wrap to several rows
        page.click(".p-multiselect")
        page.wait_for_selector(".p-multiselect-item", timeout=10000)
        items = page.locator(".p-multiselect-item")
        for i in range(items.count()):
            items.nth(i).click()
        page.keyboard.press("Escape")
        page.wait_for_timeout(600)

        for theme in ("codemieLight", "codemieDark"):
            page.evaluate("t => { document.documentElement.className = t }", theme)
            page.wait_for_timeout(400)
            out["modes"][f"after_{theme}"] = page.evaluate(MEASURE)
            page.screenshot(path=f"{SHOTS}/custom-fields-after-{theme}.png", full_page=True)

        # baseline: strip the fix classes from the live control, same DOM/data
        page.evaluate("""(cls) => {
            const ms = document.querySelector('.p-multiselect');
            cls.forEach(c => ms.classList.remove(c));
            ms.classList.add('mb-3');
        }""", FIX_CLASSES)
        page.wait_for_timeout(400)
        for theme in ("codemieLight", "codemieDark"):
            page.evaluate("t => { document.documentElement.className = t }", theme)
            page.wait_for_timeout(400)
            out["modes"][f"before_{theme}"] = page.evaluate(MEASURE)
            page.screenshot(path=f"{SHOTS}/custom-fields-before-{theme}.png", full_page=True)

        browser.close()
    print(json.dumps(out, indent=1))

run()
