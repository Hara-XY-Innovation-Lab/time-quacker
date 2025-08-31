const fs = require('fs');
const path = require('path');

const splashDir = path.join(__dirname, '..', '..', 'Assets', 'splash');
let splashShufflePool = [];

function getSplashImages() {
  if (fs.existsSync(splashDir)) {
    const files = fs.readdirSync(splashDir);
    return files.filter(f => /\.(png|jpe?g|gif|bmp|webp)$/i.test(f));
  }
  return [];
}

function getRandomSplashImage() {
  if (splashShufflePool.length === 0) {
    const allImages = getSplashImages();
    for (let i = allImages.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allImages[i], allImages[j]] = [allImages[j], allImages[i]];
    }
    splashShufflePool = allImages;
  }

  const chosen = splashShufflePool.pop();
  if (!chosen) return null;
  return 'file://' + path.join(splashDir, chosen).replace(/\\/g, '/');
}

module.exports = { getRandomSplashImage };