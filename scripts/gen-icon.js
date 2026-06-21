const { PNG } = require('pngjs');
const fs = require('fs');
const path = require('path');

const S = 512, R = S/2;
const png = new PNG({ width: S, height: S });

function px(x, y, r, g, b, a) {
  if (x < 0 || x >= S || y < 0 || y >= S) return;
  const i = (S * Math.round(y) + Math.round(x)) * 4;
  png.data[i] = r; png.data[i+1] = g; png.data[i+2] = b; png.data[i+3] = a;
}
function circ(cx, cy, r, fill) {
  for (let y = Math.floor(cy-r-1); y <= Math.ceil(cy+r+1); y++)
    for (let x = Math.floor(cx-r-1); x <= Math.ceil(cx+r+1); x++) {
      const d = Math.sqrt((x-cx)**2 + (y-cy)**2) - r;
      if (d < 0) px(x, y, fill.r, fill.g, fill.b, fill.a);
      else if (d < 1) px(x, y, fill.r, fill.g, fill.b, Math.round(fill.a * (1-d)));
    }
}

// Deep blue background circle
circ(R, R, R-2, {r:26, g:58, b:110, a:255});

// 2 white elliptical orbits
const oxr = R*0.68, oyr = R*0.19;
for (let k = 0; k < 2; k++) {
  const angle = k * Math.PI/2;
  for (let j = 0; j <= 80; j++) {
    const a = (Math.PI*2*j)/80;
    const cx = R + oxr*Math.cos(a)*Math.cos(angle) - oyr*Math.sin(a)*Math.sin(angle);
    const cy = R + oxr*Math.cos(a)*Math.sin(angle) + oyr*Math.sin(a)*Math.cos(angle);
    circ(cx, cy, 3, {r:255,g:255,b:255,a:255});
  }
}

// 4 nodes
for (let i = 0; i < 4; i++) {
  const a = (Math.PI*2*i)/4 - Math.PI/4;
  const nr = R*0.48;
  circ(R + nr*Math.cos(a), R + nr*Math.sin(a), 14, {r:255,g:255,b:255,a:255});
}

// Center "?"
const qy = R - R*0.08;
// Arc
circ(R+28, qy, 40, {r:255,g:255,b:255,a:255});
circ(R-28, qy, 40, {r:255,g:255,b:255,a:255});
circ(R, qy+10, 40, {r:255,g:255,b:255,a:255});
// Hollow
circ(R+28, qy, 28, {r:26,g:58,b:110,a:255});
circ(R-28, qy, 28, {r:26,g:58,b:110,a:255});
circ(R, qy+10, 28, {r:26,g:58,b:110,a:255});
// Stem
for (let y = qy+50; y <= qy+160; y += 2) {
  const w = y < qy+100 ? 12 : 9;
  circ(R, y, w, {r:255,g:255,b:255,a:255});
}
// Dot
circ(R, qy+185, 15, {r:255,g:255,b:255,a:255});

const outDir = path.join(__dirname, '../electron/assets');
fs.mkdirSync(outDir, { recursive: true });
png.pack().pipe(fs.createWriteStream(path.join(outDir, 'icon.png')));
console.log('Icon saved to', path.join(outDir, 'icon.png'));
