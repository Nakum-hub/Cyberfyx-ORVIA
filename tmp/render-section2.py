from pathlib import Path
import markdown

source = Path('docs/leadership/2026-09-25-section-2-evidence-update.md')
body = markdown.markdown(source.read_text(encoding='utf-8'), extensions=['tables'])
html = '''<!doctype html><html><head><meta charset="utf-8"><style>
@page { size: A4 landscape; margin: 13mm 14mm 12mm; }
body { font-family: Arial, sans-serif; color: #152b40; font-size: 8.5pt; line-height: 1.32; }
h1 { font-size: 19pt; margin: 0 0 5mm; color: #0d2948; }
h2 { font-size: 11.5pt; margin: 5mm 0 2mm; color: #153e67; break-after: avoid; }
p { margin: 0 0 2mm; }
table { border-collapse: collapse; width: 100%; font-size: 7.5pt; table-layout: fixed; }
th { background: #123c64; color: white; text-align: left; }
th,td { border: 1px solid #b6c5d5; padding: 2mm; vertical-align: top; overflow-wrap: anywhere; }
tr { break-inside: avoid; }
th:nth-child(1),td:nth-child(1) { width: 29%; }
th:nth-child(2),td:nth-child(2) { width: 27%; }
th:nth-child(3),td:nth-child(3) { width: 44%; }
a { color: #125a9b; text-decoration: none; }
li { margin-bottom: 1.5mm; }
</style></head><body>''' + body + '</body></html>'
Path('tmp/section2-evidence-update.html').write_text(html, encoding='utf-8')
