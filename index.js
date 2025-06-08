#!/usr/bin/env node

// index.js

const axios = require('axios');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// All our helper functions from before remain the same
async function getArticleContent(url) {
    // ... (paste the entire getArticleContent function from the previous code here)
    try {
        const response = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36' } });
        const dom = new JSDOM(response.data, { url });
        const reader = new Readability(dom.window.document);
        const article = reader.parse();
        if (article) {
            article.url = url;
        }
        return article;
    } catch (error) {
        console.error(`Error fetching or parsing article from ${url}:`, error.message);
        return null;
    }
}

async function processImages(article, tempDir) {
    const dom = new JSDOM(article.content);
    const document = dom.window.document;
    const images = [...document.getElementsByTagName('img')];
    const imagePromises = [];

    if (images.length === 0) {
        console.log('No images found in the article.');
        return article.content;
    }

    console.log(`Found ${images.length} images. Downloading...`);

    for (const img of images) {
        const originalSrc = img.getAttribute('src');
        if (!originalSrc) continue;

        try {
            // Create an absolute URL for the image
            const imageUrl = new URL(originalSrc, article.url).href;
            
            // Generate a unique local filename
            const fileExtension = path.extname(new URL(imageUrl).pathname) || '.jpg';
            const hash = crypto.createHash('sha1').update(imageUrl).digest('hex');
            const localFilename = `${hash}${fileExtension}`;
            const localPath = path.join(tempDir, localFilename);

            // Create a promise for downloading the image
            const downloadPromise = axios.get(imageUrl, { responseType: 'arraybuffer' })
                .then(response => fs.writeFile(localPath, response.data))
                .then(() => {
                    // IMPORTANT: Update the image src to the new local path
                    img.setAttribute('src', localFilename);
                    console.log(`- Downloaded ${imageUrl}`);
                })
                .catch(err => {
                    console.error(`- Failed to download ${imageUrl}: ${err.message}`);
                });

            imagePromises.push(downloadPromise);

        } catch (error) {
            console.error(`- Invalid image URL: ${originalSrc}`);
        }
    }

    // Wait for all images to be processed
    await Promise.all(imagePromises);

    // Return the modified HTML
    return dom.serialize();
}

function createEpub(htmlContent, title, author, tempDir) {
  return new Promise(async (resolve, reject) => {
    const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const inputHtmlPath = path.join(tempDir, 'article.html');
    const outputEpubPath = path.join(__dirname, `${sanitizedTitle}.epub`);

    try {
      await fs.writeFile(inputHtmlPath, htmlContent);

      // The --resource-path=. tells Pandoc to look for images in the CWD.
      // The `cwd` option for exec ensures the command runs in our temporary directory.
      const command = `pandoc "${path.basename(inputHtmlPath)}" -o "${outputEpubPath}" --metadata title="${title}" --metadata author="${author}" --resource-path=.`;
      console.log(`Executing command in directory: ${tempDir}`);
      
      exec(command, { cwd: tempDir }, (error, stdout, stderr) => {
        if (error) {
          console.error(`Pandoc Error: ${stderr}`);
          return reject(error);
        }
        console.log(`Pandoc output: ${stdout}`);
        resolve(outputEpubPath);
      });
    } catch (err) {
      reject(err);
    }
  });
}

// This is the main function that runs the entire process
async function main(argv) { 
    let tempDir = null;
    try {
        const { url } = argv;
        console.log(`Attempting to extract article from: ${url}\n`);

        const article = await getArticleContent(url);
        if (!article || !article.content) {
            throw new Error('Could not extract article content.');
        }

        console.log('--- ARTICLE EXTRACTED ---');
        console.log('Title:', article.title);

        tempDir = await fs.mkdtemp(path.join(__dirname, 'article-'));
        console.log(`Created temporary directory: ${tempDir}`);

        const modifiedHtml = await processImages(article, tempDir);

        console.log('\n--- CREATING EPUB FILE ---');
        const epubFilePath = await createEpub(
            modifiedHtml,
            article.title,
            article.byline || 'Unknown Author',
            tempDir
        );
        console.log(`\n✅ Success! EPUB file created at: ${epubFilePath}`);
    } catch (error) {
        console.error('\n❌ An error occurred during the process:', error.message);
        process.exit(1); // Exit with an error code
    } finally {
        if (tempDir) {
            await fs.rm(tempDir, { recursive: true, force: true });
            console.log(`Cleaned up temporary directory: ${tempDir}`);
        }
    }
}

const cac = require('cac');
// ... (all your other require/import statements and functions)

// Initialize a new CLI instance
const cli = cac('extract-epub');

cli
    .command('<url>', 'Extract an article and save it as an EPUB')
    .action(async (url, options) => {
        // The .action() callback receives positional arguments directly.
        await main({ url });
    });

cli.help(); // Adds the -h, --help flag
cli.version('1.0.0'); // Adds the -v, --version flag

// Parse the arguments
try {
    cli.parse();
} catch (error) {
    // cac throws an error on parsing failure, which you can catch.
    console.error(error.message);
    process.exit(1);
}
