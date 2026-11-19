import sys
P='#c792f5'; Y='#f6c64e'; T='#5fe3c9'; H='#f4907f'; BG='#0c0f2b'
def mark(mono=False):
    c=lambda x: '#ffffff' if mono else x
    hearts=''.join(f'<use href="#h" x="{x}" y="17"/>' for x in (28,38.5,49,59.5,70))
    return f'''<g fill="{c(H)}" stroke="none">{hearts}</g>
<path stroke="{c(P)}" d="M45 27H23.5Q19 27 19 31.5V40"/>
<path stroke="{c(P)}" d="M21 47Q21 41 15 41Q10 41 10 46.5Q10 51 14 51.5V66M21 47V55M19.5 62H45"/>
<path stroke="{c(Y)}" d="M21 55Q25 52.5 32 52.5H45M14 70H45M17 73.5L14.5 80M26 73.5L28 80"/>
<path stroke="{c(P)}" d="M49.5 33.5L53 37L59 29.5M62 29.5H90M62 36H80"/>
<path stroke="{c(Y)}" d="M49.5 46.5L53 50L59 42.5M62 42.5H88M62 49H82"/>
<path stroke="{c(T)}" d="M49.5 59L53 62.5L59 55M62 55.5H88M62 62H81M48 66.5H82M48 72H85Q87.5 72 87.5 69.5V64M74 75.5L71.5 80M83 75.5L85.5 80"/>'''
def svg(bg=True, scale=1.0, glow=True, mono=False, size=1024, sw=2.2):
    # content box is x 9..91, y 13..81 -> centre (50,47); recentre to (50,50)
    t=f'translate(50 50) scale({scale}) translate(-50 -47)'
    f='filter="url(#glow)"' if glow else ''
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="{size}" height="{size}">
<defs><filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
<feGaussianBlur stdDeviation="1.1" result="b1"/><feComponentTransfer in="b1" result="b2"><feFuncA type="linear" slope="0.7"/></feComponentTransfer>
<feMerge><feMergeNode in="b2"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<path id="h" d="M0 2.6C-2.4 1-3.6-.4-3.6-1.7-3.6-2.8-2.8-3.6-1.8-3.6-1-3.6-.4-3.2 0-2.5.4-3.2 1-3.6 1.8-3.6 2.8-3.6 3.6-2.8 3.6-1.7 3.6-.4 2.4 1 0 2.6z"/></defs>
{f'<rect width="100" height="100" fill="{BG}"/>' if bg else ''}
<g transform="{t}"><g {f} fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="{sw}">{mark(mono)}</g></g></svg>'''
out={
 'icon.svg': svg(size=1024),
 'fg.svg': svg(bg=False, scale=0.6, size=512),
 'bg.svg': f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="512" height="512"><rect width="100" height="100" fill="{BG}"/></svg>',
 'mono.svg': svg(bg=False, scale=0.6, glow=False, mono=True, size=432),
 'splash.svg': svg(bg=False, size=1024),
 'favicon.svg': svg(size=48, sw=3.2, glow=False),
}
for k,v in out.items(): open(k,'w').write(v)
