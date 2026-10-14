// round.js
import fs from 'node:fs';

const size = 512;
const radius = Math.round(size * 0.22); // Exactly 22% = 113px

// An SVG mask with the 22% rounded corners
const svg = `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="clip">
      <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" />
    </clipPath>
  </defs>
  <image href="data:image/png;base64,${fs.readFileSync('./static/icon-512x512.png').toString('base64')}"
         width="${size}" height="${size}" clip-path="url(#clip)" />
</svg>
`;

fs.writeFileSync('./static/icon-rounded.svg', svg);
console.log('Done! Created static/icon-rounded.svg with 22% radius.');