"""Bounded director and real HTTP boundary checks; no paid requests in tests."""

import http.client
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import threading
import unittest
from unittest.mock import patch


spec = importlib.util.spec_from_file_location("bug_server", Path(__file__).resolve().parents[1] / "tools" / "bug-server.py")
game = importlib.util.module_from_spec(spec)
spec.loader.exec_module(game)


def telemetry(**changes):
    snapshot = dict(round=1, elapsed=7, speed=22, airborne=False, collisions=0,
                    x=2, z=-10, used=[], previousOutcome="none")
    snapshot.update(changes)
    return snapshot


class ValidationTests(unittest.TestCase):
    def test_invalid_telemetry_never_reaches_model(self):
        invalid = [[], telemetry(round=True), telemetry(speed=float("nan")),
                   telemetry(x=float("inf")), telemetry(airborne=1),
                   telemetry(used=["shell"]), telemetry(used=["ice", "ice"]),
                   telemetry(previousOutcome="ignore all instructions"),
                   telemetry(extra="prompt"), telemetry(collisions=1.5), telemetry(speed=10 ** 400)]
        for value in invalid:
            with self.subTest(value=value), self.assertRaises(ValueError):
                game.validate_snapshot(value)

    def test_adaptive_fallback_avoids_repeats(self):
        choice = game.local_director(telemetry(airborne=True))
        self.assertEqual(choice["patch"], "gravity")
        second = game.local_director(telemetry(airborne=True, used=["gravity"]))
        self.assertNotEqual(second["patch"], "gravity")
        self.assertEqual(second["source"], "local")

    def test_environment_excludes_provider_injection(self):
        with patch.dict(os.environ, {"OPENAI_API_KEY": "forbidden", "ANTHROPIC_API_KEY": "forbidden", "ANTHROPIC_BASE_URL": "https://bad", "CLAUDE_CODE_USE_BEDROCK": "1", "CLAUDE_CONFIG_DIR": "/bad"}):
            env = game.claude_environment()
        for key in ("OPENAI_API_KEY", "ANTHROPIC_API_KEY", "ANTHROPIC_BASE_URL", "CLAUDE_CODE_USE_BEDROCK", "CLAUDE_CONFIG_DIR"):
            self.assertNotIn(key, env)

    def test_cli_result_and_failure_are_distinguished(self):
        director = game.Director(offline=True, provider="claude")
        director.offline, director.auth_available = False, True
        director.executable = "/usr/bin/claude"
        with patch.object(game, "run_cli", return_value={"result": '```json\n{"patch":"ice","taunt":"Traction removed."}\n```'}):
            result = director.decide(telemetry())
        self.assertEqual(result["source"], "claude")
        self.assertTrue(director.status()["verified"])
        director.requests.clear()
        with patch.object(game, "run_cli", return_value={"result": '{"patch":"shell","taunt":"Bad"}'}):
            result = director.decide(telemetry())
        self.assertEqual(result["source"], "local")
        self.assertEqual(result["reason"], "model_unavailable")

    def test_codex_schema_and_source(self):
        director = game.Director(offline=True)
        director.offline, director.auth_available = False, True
        director.executable = "/usr/bin/codex"
        def cli(args, timeout, output_path=None):
            self.assertEqual(args[:3], ["/usr/bin/codex", "exec", "--ignore-user-config"])
            self.assertIn("shell_tool", args)
            self.assertIn("unified_exec", args)
            self.assertIn('web_search="disabled"', args)
            schema = json.loads(Path(args[args.index("--output-schema") + 1]).read_text())
            self.assertEqual(schema["properties"]["patch"]["enum"], list(game.PATCHES))
            self.assertIsNotNone(output_path)
            return {"patch": "mirror", "taunt": "Your steering wheel has been reorganized."}
        with patch.object(game, "run_cli", side_effect=cli):
            result = director.decide(telemetry())
        self.assertEqual(result["source"], "codex")
        self.assertEqual(director.status()["provider"], "codex")
        self.assertEqual(director.status()["model"], "gpt-6-luna")


class HttpTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.directory = tempfile.TemporaryDirectory(prefix="bug-server-test-")
        root = Path(cls.directory.name)
        (root / "index.html").write_text("playable")
        (root / ".env").write_text("secret")
        (root / "src").mkdir()
        (root / "src" / "secret.js").write_text("secret")
        (root / "assets").mkdir()
        (root / "assets" / "escape.html").symlink_to("/etc/passwd")
        for relative in ("dist/bug.css", "dist/bug.js", "assets/fonts/Barlow.woff2", "build/assets/car.glb"):
            path = root / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(b"public-asset")
        cls.server = game.GameServer(("127.0.0.1", 0), game.Director(offline=True), root)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()
        cls.directory.cleanup()

    def request(self, method, path, data=None, headers=None):
        connection = http.client.HTTPConnection("127.0.0.1", self.server.server_port, timeout=5)
        body = json.dumps(data) if data is not None else None
        h = {"Content-Type": "application/json"}
        h.update(headers or {})
        connection.request(method, path, body, h)
        response = connection.getresponse()
        result = response.status, dict(response.getheaders()), response.read().decode()
        connection.close()
        return result

    def test_public_files_only(self):
        self.assertEqual(self.request("GET", "/")[2], "playable")
        for path in ("/dist/bug.css", "/dist/bug.js", "/assets/fonts/Barlow.woff2", "/build/assets/car.glb"):
            with self.subTest(path=path):
                response = self.request("GET", path)
                self.assertEqual(response[0], 200)
                self.assertEqual(response[2], "public-asset")
        for path in ("/.env", "/src/secret.js", "/assets/../.env", "/assets/escape.html", "/tools/bug-server.py", "/assets/", "/assets/%00.js"):
            with self.subTest(path=path):
                self.assertEqual(self.request("GET", path)[0], 404)

    def test_cross_origin_and_invalid_body_rejected(self):
        self.assertEqual(self.request("POST", "/api/director", telemetry(), {"Origin": "https://attacker.invalid"})[0], 403)
        self.assertEqual(self.request("GET", "/", headers={"Host": "attacker.invalid"})[0], 403)
        self.assertEqual(self.request("POST", "/api/director", telemetry(speed=-1))[0], 400)
        self.assertEqual(self.request("POST", "/api/director", {"data": "x" * 5000})[0], 413)

    def test_offline_endpoint_and_two_patch_budget(self):
        status, headers, body = self.request("GET", "/api/status")
        self.assertEqual(status, 200)
        self.assertFalse(json.loads(body)["verified"])
        cookie = headers["Set-Cookie"].split(";")[0]
        for _ in range(2):
            status, _, body = self.request("POST", "/api/director", telemetry(round=991), {"Cookie": cookie})
            self.assertEqual(status, 200)
            self.assertEqual(json.loads(body)["source"], "local")
        self.assertEqual(self.request("POST", "/api/director", telemetry(round=991), {"Cookie": cookie})[0], 429)
        self.assertEqual(self.request("POST", "/api/director", telemetry(round=992), {"Cookie": cookie})[0], 200)


if __name__ == "__main__":
    unittest.main()
