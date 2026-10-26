import http.server
import socketserver
import json
import csv
import io
import re
import os
import ssl
import urllib.request
from datetime import datetime
from urllib.parse import urlparse, parse_qs, quote

PORT = 3000
SHEET_ID = "1uXyB0U9ewC7EErKhjgpMl5nLNTV2LOgv9uq29emxlDo"
GID = "688658522"
CSV_EXPORT_URL = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv&gid={GID}"
APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyvp_nHZScu6als1bsRqJvlZiuQ9J481X71fUX5oJXbyyao9gksHx3Rzmk-fh9bGdZJ/exec"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_JSON_PATH = os.path.join(BASE_DIR, "data.json")
DATA_JS_PATH = os.path.join(BASE_DIR, "data.js")
OVERRIDES_PATH = os.path.join(BASE_DIR, "custom_overrides.json")

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE


def push_to_sheet(payload):
    if not APPS_SCRIPT_URL:
        return None
    try:
        data_bytes = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            APPS_SCRIPT_URL,
            data=data_bytes,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=12, context=ctx) as resp:
            return resp.read().decode("utf-8")
    except Exception as e:
        print(f"Push to sheet failed: {e}")
        return None


def extract_phones(text):
    if not text:
        return []
    matches = re.findall(r'(?:0\d{1,2}[-\s]?\d{3,4}[-\s]?\d{3,4}|\+66[-\s]?\d[-\s]?\d{3,4}[-\s]?\d{3,4}|\b0\d{8,9}\b)', text)
    cleaned = []
    for m in matches:
        p = re.sub(r'[\s-]', '', m)
        if p.startswith('+66'):
            p = '0' + p[3:]
        if p not in cleaned and len(p) >= 9:
            cleaned.append(p)
    return cleaned


def extract_emails(text):
    if not text:
        return []
    matches = re.findall(r'[\w\.-]+@[\w\.-]+\.[a-zA-Z]{2,}', text)
    cleaned = []
    for m in matches:
        if m not in cleaned:
            cleaned.append(m)
    return cleaned


def extract_urls(text):
    if not text:
        return []
    matches = re.findall(r'https?://[^\s,;"\'<>]+', text)
    cleaned = []
    for m in matches:
        u = m.rstrip('.,)>]')
        if u not in cleaned:
            cleaned.append(u)
    return cleaned


def infer_column(col_j, col_n, col_p, col_q="", col_r="", col_s="", status_recruit="", status_followup="", status_extra=""):
    col_j = (col_j or "").strip()
    col_n = (col_n or "").strip()
    col_p = (col_p or "").strip()
    col_q = (col_q or "").strip()
    col_r = (col_r or "").strip()
    col_s = (col_s or "").strip()

    # Group 3 Priority: ปัดตก / ปิดรับสมัคร
    # ถ้าติ๊ก ปัดตก ❌ Col J ปิดรับสมัคร ❌ Col N พร้อมกัน จะขึ้นสถานะแค่ ปัดตก
    if col_j == "❌":
        return "dropped"
    if col_n == "❌":
        return "closed"

    # Group 2 Priority: ขั้นตอนสมัคร (ได้ที่แล้ว -> สัมภาษณ์ -> โทรตามผล -> ส่งใบสมัครแล้ว)
    if col_s == "✅":
        return "accepted"
    if col_r == "✅":
        return "interview"
    if col_q == "✅":
        return "following_up"
    if col_p == "✅":
        return "applied"

    # Group 1: เล็งไว้แต่ยังไม่ยื่น (Col P == ❌)
    if col_p == "❌":
        return "target"

    # Fallback to textual cues if present
    full = f"{status_recruit} {status_followup} {status_extra}".lower()
    if "ได้ที่แล้ว" in full or "ได้ที่เเล้ว" in full:
        return "accepted"
    if "นัดสัมภาษณ์" in full or "สัมภาษณ์" in full:
        return "interview"
    if any(kw in full for kw in ["ส่งเรซูเม่", "กดสมัคร", "ส่งใบสมัคร", "สมัครไปแล้ว", "สมัครไปเเล้ว"]):
        return "applied"

    return "target"


def fetch_and_parse_google_sheet(overwrite_local=False):
    req = urllib.request.Request(
        f"{CSV_EXPORT_URL}&t={int(datetime.now().timestamp())}",
        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    )
    with urllib.request.urlopen(req, timeout=15, context=ctx) as response:
        csv_bytes = response.read()

    csv_text = csv_bytes.decode("utf-8", errors="replace")
    reader = csv.reader(io.StringIO(csv_text))
    rows = list(reader)

    # Load existing data.json to preserve any embedded links or custom notes if not overwriting
    existing_map = {}
    if os.path.exists(DATA_JSON_PATH):
        try:
            with open(DATA_JSON_PATH, "r", encoding="utf-8") as f:
                old_list = json.load(f)
                for item in old_list:
                    existing_map[str(item.get("no", item.get("id")))] = item
        except Exception:
            pass

    overrides = {}
    if not overwrite_local and os.path.exists(OVERRIDES_PATH):
        try:
            with open(OVERRIDES_PATH, "r", encoding="utf-8") as f:
                overrides = json.load(f)
        except Exception:
            pass

    companies = []
    for r in rows[1:]:
        if not r or not any(r):
            continue
        no = r[0].strip() if len(r) > 0 else ""
        if not no.isdigit():
            continue

        cid = int(no)
        name_raw = r[1].strip() if len(r) > 1 else ""
        name = name_raw.split("\n")[0].strip()
        about = r[2].strip() if len(r) > 2 else ""
        biz_type = r[3].strip() if len(r) > 3 else ""
        location = r[4].strip() if len(r) > 4 else ""
        loc_desc = r[5].strip() if len(r) > 5 else ""
        zone = r[6].strip() if len(r) > 6 else ""
        role = r[7].strip() if len(r) > 7 else ""
        welfare = r[8].strip() if len(r) > 8 else ""
        tier = r[9].strip().replace(" ", "") if len(r) > 9 else "✅"
        reason = r[10].strip() if len(r) > 10 else ""
        contact = r[11].strip() if len(r) > 11 else ""
        status_recruit = r[12].strip() if len(r) > 12 else ""
        status_open = r[13].strip() if len(r) > 13 else ""
        status_followup = r[14].strip() if len(r) > 14 else ""
        status_extra = "\n".join([c.strip() for c in r[15:21] if c and c.strip()]) if len(r) > 15 else ""

        col_j = tier
        col_n = status_open
        col_p = r[15].strip() if len(r) > 15 else ""
        col_q = r[16].strip() if len(r) > 16 else ""
        col_r = r[17].strip() if len(r) > 17 else ""
        col_s = r[18].strip() if len(r) > 18 else ""

        combined_contact_text = f"{contact}\n{status_followup}\n{status_recruit}\n{name_raw}"
        phones = extract_phones(combined_contact_text)
        emails = extract_emails(combined_contact_text)
        urls = extract_urls(combined_contact_text)

        old_item = existing_map.get(str(no), {})
        apply_url = old_item.get("apply_url") or (urls[0] if urls else "")
        map_clean_query = location.replace("— แมพ", "").replace("- แมพ", "").strip()
        map_url = old_item.get("map_url") or (
            f"https://www.google.com/maps/search/?api=1&query={quote(map_clean_query + ' ' + zone)}"
            if map_clean_query else ""
        )

        col = infer_column(col_j, col_n, col_p, col_q, col_r, col_s, status_recruit, status_followup, status_extra)

        item = {
            "id": cid,
            "no": str(no),
            "name": name,
            "apply_url": apply_url,
            "urls": urls,
            "about": about,
            "biz_type": biz_type,
            "location": location,
            "map_url": map_url,
            "loc_desc": loc_desc,
            "zone": zone,
            "role": role,
            "welfare": welfare,
            "tier": tier,
            "col_j": col_j,
            "col_n": col_n,
            "col_p": col_p,
            "col_q": col_q,
            "col_r": col_r,
            "col_s": col_s,
            "orig_tier": col_j if col_j != "❌" else "✅",
            "orig_status_open": col_n if col_n != "❌" else "✅",
            "reason": reason,
            "contact": contact,
            "phones": phones,
            "emails": emails,
            "status_recruit": status_recruit,
            "status_open": status_open,
            "status_followup": status_followup,
            "status_extra": status_extra,
            "custom_notes": old_item.get("custom_notes", ""),
            "column": col
        }

        companies.append(item)

    # Also include any custom-added companies (id > 100 or not in sheet)
    if not overwrite_local and "_custom_added" in overrides:
        for custom_comp in overrides["_custom_added"]:
            if not any(c["id"] == custom_comp["id"] for c in companies):
                companies.append(custom_comp)

    save_companies_to_disk(companies)
    return companies


def save_companies_to_disk(companies):
    with open(DATA_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(companies, f, ensure_ascii=False, indent=2)
    with open(DATA_JS_PATH, "w", encoding="utf-8") as f:
        f.write("window.DEFAULT_COMPANIES = " + json.dumps(companies, ensure_ascii=False, indent=2) + ";\n")


class TrackerHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def log_message(self, format, *args):
        pass

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/sync-sheet":
            qs = parse_qs(parsed.query)
            overwrite = qs.get("mode", [""])[0] == "overwrite"
            try:
                companies = fetch_and_parse_google_sheet(overwrite_local=overwrite)
                payload = {
                    "ok": True,
                    "synced_at": datetime.now().strftime("%H:%M:%S"),
                    "count": len(companies),
                    "companies": companies
                }
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps(payload, ensure_ascii=False).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps({"ok": False, "error": str(e)}, ensure_ascii=False).encode("utf-8"))
            return

        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/update-sheet":
            try:
                length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(length).decode("utf-8")
                data = json.loads(body)

                # Update local data.json immediately when checkboxes change
                if data.get("action") == "update_status_checkboxes":
                    no_str = str(data.get("no", "")).strip()
                    if os.path.exists(DATA_JSON_PATH):
                        try:
                            with open(DATA_JSON_PATH, "r", encoding="utf-8") as f:
                                current_list = json.load(f)
                            for item in current_list:
                                if str(item.get("no", item.get("id"))) == no_str:
                                    item["col_p"] = data.get("col_p", "")
                                    item["col_q"] = data.get("col_q", "")
                                    item["col_r"] = data.get("col_r", "")
                                    item["col_s"] = data.get("col_s", "")
                                    item["col_j"] = data.get("col_j", "")
                                    item["col_n"] = data.get("col_n", "")
                                    item["tier"] = item["col_j"]
                                    item["status_open"] = item["col_n"]
                                    item["column"] = infer_column(item["col_j"], item["col_n"], item["col_p"], item["col_q"], item["col_r"], item["col_s"])
                                    break
                            save_companies_to_disk(current_list)
                        except Exception as e:
                            print(f"Error updating local data.json for checkboxes: {e}")

                # Safeguard: Never overwrite existing sheet notes or data with empty strings
                if data.get("action") == "update_company":
                    no_str = str(data.get("no", "")).strip()
                    if os.path.exists(DATA_JSON_PATH):
                        try:
                            with open(DATA_JSON_PATH, "r", encoding="utf-8") as f:
                                current_list = json.load(f)
                                match = next((item for item in current_list if str(item.get("no", item.get("id"))) == no_str), None)
                                if match:
                                    if not data.get("followup") and match.get("status_followup"):
                                        data["followup"] = match["status_followup"]
                                    elif not data.get("followup") and match.get("custom_notes"):
                                        data["followup"] = match["custom_notes"]
                                    for key, comp_key in [("contact", "contact"), ("about", "about"), ("welfare", "welfare"), ("reason", "reason")]:
                                        if not data.get(key) and match.get(comp_key):
                                            data[key] = match[comp_key]
                        except Exception:
                            pass

                resp = push_to_sheet(data)
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps({"ok": True, "result": resp}).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps({"ok": False, "error": str(e)}).encode("utf-8"))
            return

        if parsed.path == "/api/save":
            try:
                length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(length).decode("utf-8")
                data = json.loads(body)
                companies = data.get("companies", [])
                if companies:
                    save_companies_to_disk(companies)
                    overrides = {"_custom_added": []}
                    for c in companies:
                        if int(c.get("id", 0)) > 59:
                            overrides["_custom_added"].append(c)
                    with open(OVERRIDES_PATH, "w", encoding="utf-8") as f:
                        json.dump(overrides, f, ensure_ascii=False, indent=2)

                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps({"ok": True, "saved_at": datetime.now().strftime("%H:%M:%S")}).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps({"ok": False, "error": str(e)}).encode("utf-8"))
            return


if __name__ == "__main__":
    http.server.ThreadingHTTPServer.allow_reuse_address = True
    with http.server.ThreadingHTTPServer(("127.0.0.1", PORT), TrackerHandler) as httpd:
        httpd.serve_forever()
