// Raster-only local decoding/re-encoding. SVG/HTML URLs never enter the UI.
export function validImages(value) {
  return value && ['clear','patina'].every(k => typeof value[k] === 'string' && value[k].length < 2_800_000 && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value[k]));
}
export async function importImage(file) {
  if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > 5*1024*1024) throw new Error('请选择 5 MB 以下的 PNG、JPEG 或 WebP。');
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width*bitmap.height > 25_000_000) throw new Error('图片尺寸过大，请先裁切。');
    const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d');
    const scale = Math.min(1,384/Math.max(bitmap.width,bitmap.height));
    canvas.width = Math.max(1,Math.round(bitmap.width*scale)); canvas.height = Math.max(1,Math.round(bitmap.height*scale));
    ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
    const clear = canvas.toDataURL('image/png');
    const small = document.createElement('canvas'); small.width = 72; small.height = Math.max(1,Math.round(canvas.height/canvas.width*72));
    const sc = small.getContext('2d'); sc.fillStyle = '#fff'; sc.fillRect(0,0,small.width,small.height); sc.drawImage(canvas,0,0,small.width,small.height);
    // Keep original alpha shape while deliberately recompressing RGB.
    const degraded = await createImageBitmap(await (await fetch(small.toDataURL('image/jpeg',0.25))).blob());
    sc.drawImage(degraded,0,0); degraded.close(); sc.globalCompositeOperation = 'destination-in'; sc.drawImage(canvas,0,0,small.width,small.height);
    return { clear, patina:small.toDataURL('image/png') };
  } finally { bitmap.close(); }
}
