"""Small, isolated checks for pinned historical source lookup."""
import hashlib
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import evidence_rules as rules


class HistoricalSourceTests(unittest.TestCase):
    def test_moved_source_is_read_at_pinned_commit(self):
        with tempfile.TemporaryDirectory(prefix="historical-source-") as directory:
            root = Path(directory)
            subprocess.run(["git", "init", "-q", str(root)], check=True)
            source = root / "source.txt"
            source.write_text("approved source\n", encoding="utf-8")
            subprocess.run(["git", "-C", str(root), "add", "source.txt"], check=True)
            subprocess.run(["git", "-C", str(root), "-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "commit", "-qm", "fixture"], check=True)
            commit = subprocess.check_output(["git", "-C", str(root), "rev-parse", "HEAD"], text=True).strip()
            expected = hashlib.sha256(source.read_bytes()).hexdigest()
            source.unlink()
            self.assertEqual(rules.source_bytes(root, "source.txt", commit, expected), b"approved source\n")
            source.write_text("later source\n", encoding="utf-8")
            self.assertEqual(rules.source_bytes(root, "source.txt", commit, expected), b"approved source\n")
            with self.assertRaisesRegex(ValueError, "unsafe historical"):
                rules.committed_bytes(root, "../source.txt", commit)
            with self.assertRaisesRegex(ValueError, "unsafe historical"):
                rules.committed_bytes(root, "source.txt", "not-a-commit")


if __name__ == "__main__":
    unittest.main()
