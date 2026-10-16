"""Offline integration contracts: no Google/GitHub connection or real credentials."""
import base64
from copy import deepcopy
import importlib.util
import json
import os
from pathlib import Path
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location("sheets_sync", Path(__file__).resolve().parents[1] / "scripts/sync-google-sheets.py")
sync = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(sync)
ID = "1ojVZc3m0Xk0emdHye4zvwIBNUUkSA1O05xiHdQb424M"
CONFIG = {"spreadsheet_id": ID, "sync_all_tabs": True, "sheet_ids": [], "sheet_titles": [],
          "max_cells": 10000, "max_changed_cells": 1000}


def text(value):
    return {"stringValue": value}


def sheet(value="base", sid=0):
    return {"sheet_id": sid, "title": "Tab " + str(sid), "rows": [[text(value)]]}


def book(*records):
    return {"spreadsheet_id": ID, "sheets": list(records)}


def state(*records):
    return {"version": 1, "spreadsheet_id": ID, "hashes": {str(x["sheet_id"]): sync.digest(x) for x in records}}


class FakeGoogle:
    def __init__(self, *records):
        self.sheets = sync.sheet_map(records)
        self.reads, self.writes, self.requests = 0, 0, []
        self.on_read, self.error_after_write = None, False

    def read(self):
        self.reads += 1
        if self.on_read:
            self.on_read(self)
        return {"spreadsheetId": ID, "sheets": [{"properties": {
            "sheetId": x["sheet_id"], "title": x["title"], "sheetType": "GRID",
            "gridProperties": {"rowCount": 100, "columnCount": 30}},
            "data": [{"rowData": [{"values": [{"userEnteredValue": v} if v is not None else {} for v in row]}
                                  for row in x["rows"]]}]} for x in self.sheets.values()]}

    def write(self, requests):
        self.writes += 1
        self.requests = deepcopy(requests)
        for request in requests:
            update = request["updateCells"]
            self.assert_value_only(update)
            area = update["range"]
            rows = self.sheets[str(area["sheetId"])]["rows"]
            row, col = area["startRowIndex"], area["startColumnIndex"]
            while len(rows) <= row:
                rows.append([])
            while len(rows[row]) <= col:
                rows[row].append(None)
            rows[row][col] = update["rows"][0]["values"][0].get("userEnteredValue")
        self.sheets = sync.sheet_map(self.sheets.values())
        if self.error_after_write:
            raise sync.SyncError("Simulated network timeout after an applied write.")

    @staticmethod
    def assert_value_only(update):
        assert update["fields"] == "userEnteredValue"


class SynchronizationTests(unittest.TestCase):
    def test_first_import_all_tabs_never_writes_google(self):
        api = FakeGoogle(sheet(), sheet("other", 7))
        result, baseline, report = sync.run_sync(CONFIG, api, None, None, apply=True)
        self.assertEqual([0, 7], [x["sheet_id"] for x in result["sheets"]])
        self.assertEqual(0, api.writes)
        self.assertEqual(2, len(baseline["hashes"]))

    def test_first_import_refuses_preexisting_local_data(self):
        with self.assertRaises(sync.SyncError):
            sync.run_sync(CONFIG, FakeGoogle(sheet()), book(sheet("local")), None, True)

    def test_google_edit_pulls_without_write(self):
        api = FakeGoogle(sheet("google"))
        result, _, report = sync.run_sync(CONFIG, api, book(sheet()), state(sheet()), True)
        self.assertEqual("google", result["sheets"][0]["rows"][0][0]["stringValue"])
        self.assertEqual("pull", report["actions"][0]["action"])
        self.assertEqual(0, api.writes)

    def test_github_edit_pushes_one_cell_and_preserves_types(self):
        api = FakeGoogle(sheet())
        result, _, _ = sync.run_sync(CONFIG, api, book(sheet("00123")), state(sheet()), True)
        self.assertEqual(1, api.writes)
        self.assertEqual(1, len(api.requests))
        self.assertEqual(text("00123"), api.sheets["0"]["rows"][0][0])

    def test_simultaneous_same_tab_changes_make_no_write(self):
        api = FakeGoogle(sheet("google"))
        result, baseline, report = sync.run_sync(CONFIG, api, book(sheet("github")), state(sheet()), True)
        self.assertIsNone(result)
        self.assertIsNone(baseline)
        self.assertEqual(1, len(report["conflicts"]))
        self.assertEqual(0, api.writes)

    def test_different_tabs_sync_in_both_directions(self):
        old_a, old_b = sheet(), sheet("second", 7)
        api = FakeGoogle(sheet("google"), old_b)
        result, _, report = sync.run_sync(CONFIG, api, book(old_a, sheet("github", 7)), state(old_a, old_b), True)
        self.assertEqual(["google", "github"], [s["rows"][0][0]["stringValue"] for s in result["sheets"]])
        self.assertFalse(report["conflicts"])

    def test_dry_run_has_no_google_writes(self):
        api = FakeGoogle(sheet())
        _, _, report = sync.run_sync(CONFIG, api, book(sheet("edit")), state(sheet()), False)
        self.assertEqual(1, report["google_changed_cells"])
        self.assertEqual(0, api.writes)

    def test_prewrite_race_cancels_without_write(self):
        api = FakeGoogle(sheet())
        api.on_read = lambda obj: obj.sheets.update({"0": sheet("concurrent")}) if obj.reads == 2 else None
        with self.assertRaisesRegex(sync.SyncError, "no write was attempted"):
            sync.run_sync(CONFIG, api, book(sheet("edit")), state(sheet()), True)
        self.assertEqual(0, api.writes)

    def test_postwrite_race_does_not_advance_state(self):
        api = FakeGoogle(sheet())
        api.on_read = lambda obj: obj.sheets.update({"0": sheet("concurrent")}) if obj.reads == 3 else None
        with self.assertRaisesRegex(sync.SyncError, "state was not advanced"):
            sync.run_sync(CONFIG, api, book(sheet("edit")), state(sheet()), True)

    def test_uncertain_applied_write_is_verified_not_repeated(self):
        api = FakeGoogle(sheet())
        api.error_after_write = True
        result, _, _ = sync.run_sync(CONFIG, api, book(sheet("edit")), state(sheet()), True)
        self.assertEqual(1, api.writes)
        self.assertEqual("edit", result["sheets"][0]["rows"][0][0]["stringValue"])

    def test_converged_after_failed_git_commit_never_rewrites_google(self):
        api = FakeGoogle(sheet("edit"))
        _, _, report = sync.run_sync(CONFIG, api, book(sheet("edit")), state(sheet()), True)
        self.assertEqual("converged", report["actions"][0]["action"])
        self.assertEqual(0, api.writes)

    def test_explicit_conflict_resolution(self):
        for side in ["google", "github"]:
            api = FakeGoogle(sheet("google"))
            result, _, report = sync.run_sync(CONFIG, api, book(sheet("github")), state(sheet()), True, side, [0])
            self.assertEqual(side, result["sheets"][0]["rows"][0][0]["stringValue"])
            self.assertFalse(report["conflicts"])

    def test_google_rename_is_pulled(self):
        renamed = sheet(); renamed["title"] = "Renamed"
        result, _, _ = sync.run_sync(CONFIG, FakeGoogle(renamed), book(sheet()), state(sheet()), True)
        self.assertEqual("Renamed", result["sheets"][0]["title"])

    def test_github_rename_and_delete_are_not_propagated(self):
        changed = sheet(); changed["title"] = "Renamed"
        for local in [book(changed), book()]:
            api = FakeGoogle(sheet())
            _, _, report = sync.run_sync(CONFIG, api, local, state(sheet()), True)
            self.assertTrue(report["conflicts"])
            self.assertEqual(0, api.writes)

    def test_google_tab_delete_is_reflected_in_git(self):
        api = FakeGoogle(sheet("second", 7))
        result, _, _ = sync.run_sync(CONFIG, api, book(sheet(), sheet("second", 7)), state(sheet(), sheet("second", 7)), True)
        self.assertEqual([7], [s["sheet_id"] for s in result["sheets"]])

    def test_clear_only_changed_cell_preserves_formats(self):
        original = sheet(); original["rows"] = [[text("a"), text("b")]]
        wanted = sheet(); wanted["rows"] = [[text("a")]]
        api = FakeGoogle(original)
        sync.run_sync(CONFIG, api, book(wanted), state(original), True)
        self.assertEqual({}, api.requests[0]["updateCells"]["rows"][0]["values"][0])
        self.assertEqual("userEnteredValue", api.requests[0]["updateCells"]["fields"])

    def test_formulas_and_literal_equals_strings_remain_distinct(self):
        wanted = sheet(); wanted["rows"] = [[{"formulaValue": "=1+2"}, text("=1+2"), {"boolValue": False}, {"numberValue": 0}]]
        api = FakeGoogle(sheet())
        result, _, _ = sync.run_sync(CONFIG, api, book(wanted), state(sheet()), True)
        self.assertEqual(wanted, result["sheets"][0])

    def test_invalid_cells_and_limits_stop_before_writes(self):
        for value in ["raw", {"numberValue": True}, {"numberValue": float("nan")}, {"numberValue": 10**1000}, {"formulaValue": "sum"}, {"stringValue": "x", "boolValue": True}]:
            with self.assertRaises(sync.SyncError):
                sync.cell(value)
        original = sheet()
        wanted = sheet(); wanted["rows"] = [[text("new"), text("second")]]
        with self.assertRaises(sync.SyncError):
            sync.run_sync({**CONFIG, "max_changed_cells": 1}, FakeGoogle(original), book(wanted), state(original), True)

    def test_selected_scope_missing_or_foreign_workbook_stops(self):
        with self.assertRaises(sync.SyncError):
            sync.run_sync({**CONFIG, "sync_all_tabs": False, "sheet_ids": [99]}, FakeGoogle(sheet()), None, None, True)
        with self.assertRaises(sync.SyncError):
            sync.run_sync(CONFIG, FakeGoogle(sheet()), {"spreadsheet_id": "other", "sheets": []}, None, True)

    def test_token_is_signed_for_google_only(self):
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import padding, rsa
        key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        pem = key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()).decode()
        account = json.dumps({"type": "service_account", "client_email": "test@example.invalid", "private_key": pem, "token_uri": "https://untrusted.invalid"})
        with patch.dict(os.environ, {"GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON": account}), patch.object(sync, "request_json", return_value={"access_token": "test-token"}) as request:
            self.assertEqual("test-token", sync.google_token())
        self.assertEqual("https://oauth2.googleapis.com/token", request.call_args.args[0])
        from urllib.parse import parse_qs
        assertion = parse_qs(request.call_args.args[1].decode())["assertion"][0]
        header, body, signature = assertion.split(".")
        decode = lambda value: base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))
        key.public_key().verify(decode(signature), (header + "." + body).encode(), padding.PKCS1v15(), hashes.SHA256())
        self.assertEqual("https://www.googleapis.com/auth/spreadsheets", json.loads(decode(body))["scope"])


if __name__ == "__main__":
    unittest.main()
