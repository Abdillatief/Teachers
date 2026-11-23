import fs from 'fs';
import path from 'path';

const PWA_HEAD_TAGS = `
  <!-- PWA & Mobile Web App Meta Tags -->
  <meta name="theme-color" content="#0d9488">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="Sabeel">
  <meta name="application-name" content="Sabeel Academy">
  <link rel="manifest" href="/manifest.json">
  <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png">
  <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512.png">
  <link rel="icon" type="image/png" href="/favicon.png">
  <link rel="apple-touch-icon" href="/icons/icon-192.png">
  <script type="module" src="/assets/js/shared/utils/pwaManager.js"></script>
`;

function getHtmlFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git') {
      files = files.concat(getHtmlFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(fullPath);
    }
  }
  return files;
}

const htmlFiles = getHtmlFiles('.');
console.log(`Found ${htmlFiles.length} HTML files:`);

for (const file of htmlFiles) {
  let content = fs.readFileSync(file, 'utf8');

  // Check if manifest is already linked
  if (!content.includes('rel="manifest"') && !content.includes("rel='manifest'")) {
    if (content.includes('</head>')) {
      content = content.replace('</head>', `${PWA_HEAD_TAGS}\n</head>`);
      fs.writeFileSync(file, content, 'utf8');
      console.log(`✓ Injected PWA tags into: ${file}`);
    } else {
      console.warn(`! No </head> tag found in: ${file}`);
    }
  } else {
    // If manifest is present but missing pwaManager or apple tags, ensure pwaManager is included
    if (!content.includes('pwaManager.js')) {
      content = content.replace('</head>', `  <script type="module" src="/assets/js/shared/utils/pwaManager.js"></script>\n</head>`);
      fs.writeFileSync(file, content, 'utf8');
      console.log(`✓ Injected pwaManager script into: ${file}`);
    } else {
      console.log(`- Already configured: ${file}`);
    }
  }
}
console.log('PWA injection completed!');
