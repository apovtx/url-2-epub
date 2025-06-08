# Web Article to EPUB Converter

A command-line tool that converts web articles into EPUB files while preserving images and formatting.

## Features

- Extracts clean article content from web pages using Mozilla's Readability
- Downloads and embeds all article images
- Converts HTML content to EPUB format using Pandoc
- Handles relative and absolute image URLs
- Preserves article metadata (title and author)
- Cleans up temporary files automatically

## Prerequisites

- Node.js (v14 or higher)
- Pandoc (must be installed on your system)
- Bun (for building the executable)

## Installation

1. Clone this repository
2. Install dependencies:
```sh
npm install
```
3. Build the executable:
```sh
npm run build
```

## Usage

```sh
./extract-epub <url>
```

Example:
```sh
./extract-epub https://example.com/article
```

## How it Works

1. Fetches the webpage and extracts the main article content
2. Downloads all images found in the article
3. Converts the content to EPUB format using Pandoc
4. Saves the EPUB file with a sanitized version of the article title

## Options

- `-h, --help`: Display help information
- `-v, --version`: Display version number

## Output

The EPUB file will be saved in the current directory with the sanitized article title as the filename.