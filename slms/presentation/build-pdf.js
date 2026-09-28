const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function readPng(filePath) {
  const source = fs.readFileSync(filePath);
  const idat = [];
  let offset = 8;
  let width;
  let height;
  let bitDepth;
  let colorType;

  while (offset < source.length) {
    const length = source.readUInt32BE(offset);
    const type = source.toString('ascii', offset + 4, offset + 8);
    const data = source.subarray(offset + 8, offset + 8 + length);
    offset += length + 12;
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    }
    if (type === 'IDAT') idat.push(data);
  }

  if (bitDepth !== 8 || ![2, 6].includes(colorType)) {
    throw new Error('Only 8-bit RGB/RGBA PNG files are supported.');
  }

  const channels = colorType === 6 ? 4 : 3;
  const rowLength = width * channels;
  const filtered = zlib.inflateSync(Buffer.concat(idat));
  const pixels = Buffer.alloc(height * rowLength);
  let sourceOffset = 0;

  for (let row = 0; row < height; row += 1) {
    const filter = filtered[sourceOffset++];
    const rowStart = row * rowLength;
    for (let column = 0; column < rowLength; column += 1) {
      const raw = filtered[sourceOffset++];
      const left = column >= channels ? pixels[rowStart + column - channels] : 0;
      const above = row > 0 ? pixels[rowStart - rowLength + column] : 0;
      const upperLeft = row > 0 && column >= channels ? pixels[rowStart - rowLength + column - channels] : 0;
      let value = raw;
      if (filter === 1) value += left;
      if (filter === 2) value += above;
      if (filter === 3) value += Math.floor((left + above) / 2);
      if (filter === 4) {
        const estimate = left + above - upperLeft;
        const distanceLeft = Math.abs(estimate - left);
        const distanceAbove = Math.abs(estimate - above);
        const distanceUpperLeft = Math.abs(estimate - upperLeft);
        value += distanceLeft <= distanceAbove && distanceLeft <= distanceUpperLeft ? left : distanceAbove <= distanceUpperLeft ? above : upperLeft;
      }
      pixels[rowStart + column] = value & 255;
    }
  }

  if (channels === 3) return { width, height, pixels };
  const rgb = Buffer.alloc(width * height * 3);
  for (let index = 0, output = 0; index < pixels.length; index += 4, output += 3) {
    rgb[output] = pixels[index];
    rgb[output + 1] = pixels[index + 1];
    rgb[output + 2] = pixels[index + 2];
  }
  return { width, height, pixels: rgb };
}

function buildPdf() {
  const objects = [];
  const addObject = (body) => { objects.push(Buffer.isBuffer(body) ? body : Buffer.from(body)); return objects.length; };
  const catalogId = addObject('');
  const pagesId = addObject('');
  const pages = [];

  for (let index = 1; index <= 11; index += 1) {
    const image = readPng(path.join(__dirname, `rendered-${String(index).padStart(2, '0')}.png`));
    const imageId = addObject(Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${zlib.deflateSync(image.pixels).length} >>\nstream\n`), zlib.deflateSync(image.pixels), Buffer.from('\nendstream')]));
    const content = Buffer.from(`q\n960 0 0 540 0 0 cm\n/Im${index} Do\nQ`);
    const contentId = addObject(Buffer.concat([Buffer.from(`<< /Length ${content.length} >>\nstream\n`), content, Buffer.from('\nendstream')]));
    const pageId = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 960 540] /Resources << /XObject << /Im${index} ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    pages.push(pageId);
  }

  objects[catalogId - 1] = Buffer.from(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  objects[pagesId - 1] = Buffer.from(`<< /Type /Pages /Kids [${pages.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`);
  const chunks = [Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')];
  const offsets = [0];
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(chunks.reduce((total, chunk) => total + chunk.length, 0));
    chunks.push(Buffer.from(`${index + 1} 0 obj\n`), objects[index], Buffer.from('\nendobj\n'));
  }
  const xrefOffset = chunks.reduce((total, chunk) => total + chunk.length, 0);
  chunks.push(Buffer.from(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`));
  fs.writeFileSync(path.join(__dirname, 'SLMS-Project-Presentation.pdf'), Buffer.concat(chunks));
}

buildPdf();
