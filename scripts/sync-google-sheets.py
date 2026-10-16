#!/usr/bin/env python3
"""Two-way value/formula sync. Google credentials are read only from the environment."""
import argparse
import base64
import hashlib
import json
import math
import os
from pathlib import Path
import re
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
CELL_KEYS = {"stringValue", "numberValue", "boolValue", "formulaValue"}


class SyncError(Exception):
    pass


def digest(value):
    raw = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False)
    return hashlib.sha256(raw.encode()).hexdigest()


def cell(value):
    if value is None or value == {}:
        return None
    if not isinstance(value, dict) or len(value) != 1 or not set(value).issubset(CELL_KEYS):
        raise SyncError("A cell must be null or one typed userEnteredValue object.")
    key, entry = next(iter(value.items()))
    if key in ("stringValue", "formulaValue"):
        if not isinstance(entry, str) or len(entry) > 50000:
            raise SyncError("Text/formula must be a string of at most 50000 characters.")
        if key == "formulaValue" and not entry.startswith("="):
            raise SyncError("A formulaValue must begin with '='.")
        if key == "stringValue" and entry == "":
            return None
    elif key == "boolValue":
        if not isinstance(entry, bool):
            raise SyncError("A boolValue must be true or false.")
    else:
        if isinstance(entry, bool) or not isinstance(entry, (int, float)):
            raise SyncError("A numberValue must be a finite number.")
        if abs(entry) > 2**53:
            raise SyncError("Use stringValue for identifiers/numbers above 2^53.")
        if not math.isfinite(entry):
            raise SyncError("A numberValue must be a finite number.")
        if float(entry).is_integer():
            entry = int(entry)
    return {key: entry}


def normalize_sheet(sheet, max_cells=100000):
    sid, title, rows = sheet.get("sheet_id"), sheet.get("title"), sheet.get("rows")
    if isinstance(sid, bool) or not isinstance(sid, int) or sid < 0:
        raise SyncError("sheet_id must be a nonnegative integer.")
    if not isinstance(title, str) or not title or not isinstance(rows, list):
        raise SyncError("Each sheet needs a title and a rows array.")
    if len(rows) > max_cells:
        raise SyncError("Sheet exceeds max_cells.")
    result = []
    count = 0
    for row in rows:
        if not isinstance(row, list):
            raise SyncError("Each row must be an array.")
        count += len(row)
        if count > max_cells:
            raise SyncError("Sheet exceeds max_cells.")
        normalized = [cell(v) for v in row]
        while normalized and normalized[-1] is None:
            normalized.pop()
        result.append(normalized)
    while result and not result[-1]:
        result.pop()
    return {"sheet_id": sid, "title": title, "rows": result}


def sheet_map(sheets, max_cells=100000):
    result = {}
    for record in sheets:
        normalized = normalize_sheet(record, max_cells)
        sid = str(normalized["sheet_id"])
        if sid in result:
            raise SyncError("Duplicate sheet_id: " + sid)
        result[sid] = normalized
    return result


def read_google_snapshot(raw, config):
    if raw.get("spreadsheetId") != config["spreadsheet_id"]:
        raise SyncError("Google returned an unexpected spreadsheet ID.")
    selected, capacities = [], {}
    ids = set(config.get("sheet_ids", []))
    titles = set(config.get("sheet_titles", []))
    if not config.get("sync_all_tabs") and not ids and not titles:
        raise SyncError("Select tabs explicitly or set sync_all_tabs=true.")
    matched_ids, matched_titles = set(), set()
    for item in raw.get("sheets", []):
        props = item["properties"]
        sid, title = props["sheetId"], props["title"]
        if not config.get("sync_all_tabs") and sid not in ids and title not in titles:
            continue
        if props.get("sheetType", "GRID") != "GRID":
            raise SyncError("Unsupported non-GRID tab: " + str(sid))
        matched_ids.add(sid)
        matched_titles.add(title)
        rows = []
        for grid in item.get("data", []):
            start_row, start_col = grid.get("startRow", 0), grid.get("startColumn", 0)
            for offset, data in enumerate(grid.get("rowData", [])):
                pos = start_row + offset
                values = data.get("values", [])
                if pos >= config["max_cells"] or start_col + len(values) > config["max_cells"]:
                    raise SyncError("Google grid exceeds configured bounds.")
                while len(rows) <= pos:
                    rows.append([])
                while len(rows[pos]) < start_col + len(values):
                    rows[pos].append(None)
                for col, value in enumerate(values, start_col):
                    rows[pos][col] = value.get("userEnteredValue")
        selected.append({"sheet_id": sid, "title": title, "rows": rows})
        capacities[str(sid)] = props["gridProperties"]
    if ids - matched_ids or titles - matched_titles:
        raise SyncError("A selected Google tab is missing; refusing a scope-changing sync.")
    if not selected:
        raise SyncError("No selected tabs are available.")
    return sheet_map(selected, config["max_cells"]), capacities


def make_plan(local, remote, baseline, resolve=None, resolve_ids=()):
    """Conservative three-way comparison at tab granularity; no silent last-writer wins."""
    output, pushes, actions, conflicts = {}, {}, [], []
    resolve_ids = {str(x) for x in resolve_ids}
    if baseline is None:
        if local:
            raise SyncError("First sync imports Google only; existing local data needs review.")
        return dict(remote), {}, [{"sheet_id": k, "action": "import"} for k in remote], []
    for sid in sorted(set(local) | set(remote) | set(baseline), key=int):
        left, right, base = local.get(sid), remote.get(sid), baseline.get(sid)
        lh = digest(left) if left else None
        rh = digest(right) if right else None
        action, reason = None, None
        if sid in resolve_ids and resolve:
            if not left or not right:
                reason = "Cannot resolve missing/deleted tabs by overwriting."
            elif resolve == "google":
                output[sid], action = right, "resolve_from_google"
            elif left["title"] != right["title"]:
                reason = "Rename tabs in Google, not in the JSON file."
            else:
                output[sid], pushes[sid], action = left, left, "resolve_from_github"
        elif lh == rh:
            if right:
                output[sid] = right
            action = "unchanged" if rh == base else "converged"
        elif base is None:
            if left is None and right:
                output[sid], action = right, "import"
            else:
                reason = "Unknown GitHub tab; sheet creation is not supported."
        elif right is None:
            if lh == base:
                action = "removed_in_google"
            else:
                reason = "Google tab deleted while GitHub data changed."
        elif left is None:
            reason = "GitHub tab removed; deleting Google tabs is not supported."
        elif lh == base:
            output[sid], action = right, "pull"
        elif rh == base:
            if left["title"] != right["title"]:
                reason = "Rename tabs in Google, not in the JSON file."
            else:
                output[sid], pushes[sid], action = left, left, "push"
        else:
            reason = "Both Google and GitHub changed this tab since the last sync."
        if reason:
            conflicts.append({"sheet_id": sid, "reason": reason, "base_hash": base,
                              "github_hash": lh, "google_hash": rh})
        else:
            actions.append({"sheet_id": sid, "action": action})
    if resolve_ids - (set(local) & set(remote)):
        raise SyncError("Resolution IDs must exist on both sides.")
    return output, pushes, actions, conflicts


def cell_updates(remote, pushes, capacities, max_changes):
    requests = []
    for sid, desired in pushes.items():
        old_rows, new_rows = remote[sid]["rows"], desired["rows"]
        capacity = capacities[sid]
        for row in range(max(len(old_rows), len(new_rows))):
            old = old_rows[row] if row < len(old_rows) else []
            new = new_rows[row] if row < len(new_rows) else []
            for col in range(max(len(old), len(new))):
                a = old[col] if col < len(old) else None
                b = new[col] if col < len(new) else None
                if a == b:
                    continue
                if row >= capacity["rowCount"] or col >= capacity["columnCount"]:
                    raise SyncError("Expand the Google grid before writing outside its bounds.")
                value = {"userEnteredValue": b} if b is not None else {}
                requests.append({"updateCells": {"range": {"sheetId": int(sid),
                    "startRowIndex": row, "endRowIndex": row + 1,
                    "startColumnIndex": col, "endColumnIndex": col + 1},
                    "rows": [{"values": [value]}], "fields": "userEnteredValue"}})
                if len(requests) > max_changes:
                    raise SyncError("Change limit exceeded; review the change before raising max_changed_cells.")
    return requests


def request_json(url, data=None, token=None):
    headers = {"Accept": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    if isinstance(data, dict):
        data = json.dumps(data, allow_nan=False).encode()
        headers["Content-Type"] = "application/json"
    elif data is not None:
        headers["Content-Type"] = "application/x-www-form-urlencoded"
    try:
        with urlopen(Request(url, data=data, headers=headers), timeout=45) as response:
            return json.load(response)
    except HTTPError as error:
        # Do not print credentials, access tokens, request payloads or cell data.
        raise SyncError("Google API HTTP " + str(error.code) + "; check account access and enabled APIs.") from error
    except (URLError, TimeoutError) as error:
        raise SyncError("Google API connection failed; no automatic write retry was attempted.") from error


def google_token():
    credentials = os.environ.get("GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON")
    if not credentials:
        raise SyncError("Missing GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON. Add it as a GitHub Actions secret.")
    try:
        account = json.loads(credentials)
        if account.get("type") != "service_account":
            raise ValueError()
        issuer, private_key = account["client_email"], account["private_key"]
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import padding
        key = serialization.load_pem_private_key(private_key.encode(), password=None)
    except (ValueError, KeyError, TypeError):
        raise SyncError("Service-account secret is invalid; its content was not logged.") from None
    encode = lambda b: base64.urlsafe_b64encode(b).rstrip(b"=")
    now = int(time.time())
    claims = {"iss": issuer, "scope": "https://www.googleapis.com/auth/spreadsheets",
              "aud": "https://oauth2.googleapis.com/token", "iat": now, "exp": now + 3600}
    body = encode(b'{"alg":"RS256","typ":"JWT"}') + b"." + encode(json.dumps(claims).encode())
    signature = key.sign(body, padding.PKCS1v15(), hashes.SHA256())
    assertion = (body + b"." + encode(signature)).decode()
    result = request_json("https://oauth2.googleapis.com/token", urlencode({
        "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer", "assertion": assertion}).encode())
    if not result.get("access_token"):
        raise SyncError("Google did not return an access token.")
    return result["access_token"]


class Google:
    def __init__(self, spreadsheet_id, token):
        self.url = "https://sheets.googleapis.com/v4/spreadsheets/" + spreadsheet_id
        self.token = token

    def read(self):
        fields = ("spreadsheetId,sheets(properties(sheetId,title,sheetType,"
                  "gridProperties(rowCount,columnCount)),data(startRow,startColumn,"
                  "rowData(values(userEnteredValue))))")
        return request_json(self.url + "?" + urlencode({"includeGridData": "true", "fields": fields}), token=self.token)

    def write(self, requests):
        request_json(self.url + ":batchUpdate", {"requests": requests}, self.token)


def load_json(path, fallback=None):
    return json.loads(path.read_text()) if path.exists() else fallback


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + "\n")
    temporary.replace(path)


def run_sync(config, api, local_book, old_state, apply=False, resolve=None, resolve_ids=()):
    spreadsheet_id = config["spreadsheet_id"]
    for value in (local_book, old_state):
        if value is not None and value.get("spreadsheet_id") != spreadsheet_id:
            raise SyncError("Spreadsheet ID differs from the stored state; refusing cross-workbook sync.")
    if old_state is not None and old_state.get("version") != 1:
        raise SyncError("Unsupported sync-state version.")
    local = sheet_map((local_book or {}).get("sheets", []), config["max_cells"])
    remote, capacities = read_google_snapshot(api.read(), config)
    baseline = old_state["hashes"] if old_state is not None else None
    output, pushes, actions, conflicts = make_plan(local, remote, baseline, resolve, resolve_ids)
    report = {"spreadsheet_id": spreadsheet_id, "mode": "apply" if apply else "dry-run",
              "actions": actions, "conflicts": conflicts, "google_changed_cells": 0}
    if conflicts:
        return None, None, report
    requests = cell_updates(remote, pushes, capacities, config["max_changed_cells"])
    report["google_changed_cells"] = len(requests)
    if apply and requests:
        fresh, _ = read_google_snapshot(api.read(), config)
        if fresh != remote:
            raise SyncError("Google changed during the run; no write was attempted. Run again.")
        write_error = None
        try:
            api.write(requests)
        except SyncError as error:
            write_error = error
        # Read after an uncertain POST, never retry a potentially applied write blindly.
        verified, _ = read_google_snapshot(api.read(), config)
        if verified != output:
            if write_error:
                raise SyncError("Write outcome is unconfirmed. Review Google before retrying; state was not advanced.") from write_error
            raise SyncError("Google changed during/after the write. Review both sides; state was not advanced.")
    workbook = {"spreadsheet_id": spreadsheet_id,
                "sheets": [output[k] for k in sorted(output, key=int)]}
    state = {"version": 1, "spreadsheet_id": spreadsheet_id,
             "hashes": {k: digest(output[k]) for k in sorted(output, key=int)}}
    return workbook, state, report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, default=ROOT / "integrations/google-sheets/config.json")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--apply", action="store_true")
    mode.add_argument("--dry-run", action="store_true")
    parser.add_argument("--report", type=Path)
    parser.add_argument("--resolve", choices=["google", "github"])
    parser.add_argument("--sheet-id", type=int, action="append", default=[])
    args = parser.parse_args()
    if bool(args.resolve) != bool(args.sheet_id):
        parser.error("--resolve and explicit --sheet-id values are required together.")
    config = load_json(args.config)
    if not config or not re.fullmatch(r"[A-Za-z0-9_-]{20,}", config.get("spreadsheet_id", "")):
        raise SyncError("Invalid spreadsheet configuration.")
    directory = (ROOT / config["data_dir"]).resolve()
    if ROOT not in directory.parents:
        raise SyncError("data_dir must be inside this repository.")
    api = Google(config["spreadsheet_id"], google_token())
    workbook, state, report = run_sync(config, api, load_json(directory / "workbook.json"),
        load_json(directory / "sync-state.json"), args.apply, args.resolve, args.sheet_id)
    if args.report:
        write_json(args.report, report)
    if report["conflicts"]:
        print("CONFLICT: no Google write or local data update. Review the sync report.", file=sys.stderr)
        return 2
    if args.apply:
        write_json(directory / "workbook.json", workbook)
        write_json(directory / "sync-state.json", state)
    print(json.dumps({"mode": report["mode"], "actions": report["actions"],
                      "google_changed_cells": report["google_changed_cells"]}))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except SyncError as error:
        print("SYNC STOPPED: " + str(error), file=sys.stderr)
        sys.exit(1)
