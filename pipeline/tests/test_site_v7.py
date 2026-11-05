"""The v7 view files are inlined into app.js in V7_ORDER."""
import shutil
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from capraz_pipeline import site


class V7Inline(unittest.TestCase):
    def test_v7_files_are_inlined_in_order(self):
        with tempfile.TemporaryDirectory() as t:
            t = Path(t)
            fake = t / "site"
            shutil.copytree(site.SITE, fake, ignore=shutil.ignore_patterns("v7", "tests"))
            (fake / "js" / "v7").mkdir()
            (fake / "js" / "v7" / "core.js").write_text("/*C*/", encoding="utf-8")
            (fake / "js" / "v7" / "logic.js").write_text("/*L*/", encoding="utf-8")
            (t / "data").mkdir()
            with mock.patch.object(site, "SITE", fake):
                out = site.assemble(t / "data", t / "out")
            html = out.read_text(encoding="utf-8")
            self.assertNotIn("/*@@V7@@*/", html)
            self.assertLess(html.index("/*L*/"), html.index("/*C*/"))
            app_start = html.rindex('<script type="text/x-cm">')
            self.assertGreater(html.index("/*L*/"), app_start)
            self.assertLess(html.index("/*C*/"), html.index("</script>", app_start))


if __name__ == "__main__":
    unittest.main()
