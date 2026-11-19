const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const [svg, png, size, transparent] of [['icon.svg','icon.png',1024,false],['fg.svg','android-icon-foreground.png',512,true],['bg.svg','android-icon-background.png',512,false],['mono.svg','android-icon-monochrome.png',432,true],['splash.svg','splash-icon.png',1024,true],['favicon.svg','favicon.png',48,true],['small.svg','small-icon.png',96,false]]) {
    const p = await b.newPage({ viewport: { width: size, height: size } });
    await p.goto('file://' + process.cwd() + '/' + svg);
    await p.screenshot({ path: 'out/' + png, omitBackground: transparent });
    await p.close();
  }
  await b.close();
})();
