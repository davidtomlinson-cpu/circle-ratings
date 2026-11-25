"""Builds the public terms and privacy pages from legal/*.html bodies. Run: python3 legal/build.py <email> <outdir>"""
import sys, pathlib, html
here = pathlib.Path(__file__).parent
email, out = sys.argv[1], pathlib.Path(sys.argv[2])
UPDATED = '22 November 2026'
CSS = """
:root{--bg:#fbf7f2;--text:#231a15;--muted:#6b5d54;--line:#e6dcd2;--accent:#b5452f;--th:#f3ebe2}
@media (prefers-color-scheme:dark){:root{--bg:#1a1411;--text:#f2e9e1;--muted:#b3a397;--line:#3a2f29;--accent:#f08a6d;--th:#261d18}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
main{max-width:720px;margin:0 auto;padding:32px 16px 64px}h1{font-size:30px;line-height:1.2;margin:0 0 4px}
h2{font-size:20px;margin:36px 0 8px}.meta{color:var(--muted);margin:0 0 24px}a{color:var(--accent)}
nav{display:flex;gap:16px;margin-bottom:28px;font-size:14px}table{border-collapse:collapse;width:100%;margin:12px 0;font-size:14px}
th,td{border:1px solid var(--line);padding:8px;text-align:left;vertical-align:top}th{background:var(--th)}
.wrap{overflow-x:auto}li{margin:4px 0}
"""
def page(title, body):
    body = body.replace('{{EMAIL}}', f'<a href="mailto:{html.escape(email)}">{html.escape(email)}</a>')
    return f"""<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title><style>{CSS}</style></head><body><main>
<nav><a href="../">SofaClub</a><a href="../terms/">Terms of use</a><a href="../privacy/">Privacy policy</a></nav>
<h1>{title}</h1><p class="meta">Last updated {UPDATED}</p>
{body}
</main></body></html>"""
for slug, title in [('terms', 'SofaClub Terms of Use'), ('privacy', 'SofaClub Privacy Policy'), ('delete-account', 'Delete your SofaClub account'), ('auth', 'SofaClub')]:
    d = out / slug; d.mkdir(parents=True, exist_ok=True)
    html_out = page(title, (here / f'{slug}.html').read_text())
    if slug == 'auth': html_out = html_out.replace(f'<p class="meta">Last updated {UPDATED}</p>', '')
    (d / 'index.html').write_text(html_out)
(out / 'index.html').write_text(f"""<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>SofaClub</title><style>{CSS}</style></head><body><main><h1>SofaClub</h1>
<p class="meta">Rate films, TV, books and albums with your family and friends.</p>
<p><a href="terms/">Terms of use</a></p><p><a href="privacy/">Privacy policy</a></p>
<p>Help and questions: {{EMAIL}}</p></main></body></html>""".replace('{EMAIL}', f'<a href="mailto:{html.escape(email)}">{html.escape(email)}</a>'))
(out / '.nojekyll').write_text('')
