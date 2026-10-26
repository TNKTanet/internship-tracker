from http.server import BaseHTTPRequestHandler
import json
import urllib.request
import csv
import io
import re
import os
import ssl
from urllib.parse import urlparse, parse_qs, quote
from datetime import datetime

SHEET_ID = "1uXyB0U9ewC7EErKhjgpMl5nLNTV2LOgv9uq29emxlDo"
GID = "688658522"
CSV_EXPORT_URL = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv&gid={GID}"

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

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
    matches = re.findall(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', text)
    cleaned = []
    for m in matches:
        e = m.lower()
        if e not in cleaned:
            cleaned.append(e)
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

    if col_j == "❌":
        return "dropped"
    if col_n == "❌":
        return "closed"

    if col_s == "✅":
        return "accepted"
    if col_r == "✅":
        return "interview"
    if col_q == "✅":
        return "following_up"
    if col_p == "✅":
        return "applied"

    if col_p == "❌":
        return "target"

    full = f"{status_recruit} {status_followup} {status_extra}".lower()
    if "ได้ที่แล้ว" in full or "ได้ที่เเล้ว" in full:
        return "accepted"
    if "นัดสัมภาษณ์" in full or "สัมภาษณ์" in full:
        return "interview"
    if any(kw in full for kw in ["ส่งเรซูเม่", "กดสมัคร", "ส่งใบสมัคร", "สมัครไปแล้ว", "สมัครไปเเล้ว"]):
        return "applied"

    return "target"

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            req = urllib.request.Request(
                f"{CSV_EXPORT_URL}&t={int(datetime.now().timestamp())}",
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
            )
            with urllib.request.urlopen(req, timeout=12, context=ctx) as response:
                csv_bytes = response.read()

            csv_text = csv_bytes.decode("utf-8", errors="replace")
            reader = csv.reader(io.StringIO(csv_text))
            rows = list(reader)

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

                apply_url = urls[0] if urls else ""
                map_clean_query = location.replace("— แมพ", "").replace("- แมพ", "").strip()
                map_url = (
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
                    "custom_notes": status_followup,
                    "column": col
                }
                companies.append(item)

            payload = {
                "ok": True,
                "synced_at": datetime.now().strftime("%H:%M:%S"),
                "count": len(companies),
                "companies": companies
            }
            body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
            self.end_headers()
            self.wfile.write(body)
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"ok": False, "error": str(e)}).encode("utf-8"))
