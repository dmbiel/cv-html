# Dmytro Bieliaiev CV

Print-ready CV built with HTML and SCSS.

## Development

Install dependencies and compile the stylesheet:

```sh
npm install
npm run build
```

Start a local preview server:

```sh
npm run preview
```

Open <http://127.0.0.1:8765/cv.html>.

For continuous SCSS compilation:

```sh
npm run watch
```

## Automated PDF and visual verification

Generate the PDF, screenshots, and a machine-readable layout report:

```sh
npm run artifacts
```

The command uses the locally installed Chrome or Chromium and verifies:

- exactly two A4 pages;
- no page or content overflow;
- footer placement;
- local font and image loading;
- the page count of the generated PDF.

The final PDF is written to the ignored `output/pdf/` directory:

- `Dmytro-Bieliaiev-CV.pdf`

Visual QA files are written to the ignored `artifacts/` directory:

- `page-1.png`
- `page-2.png`
- `layout-report.json`

Set `CHROME_PATH` when Chrome is installed in a non-standard location.

## Chrome Print-to-PDF

Use the following print settings:

- Paper size: A4
- Scale: 100%
- Margins: None
- Headers and footers: Off
- Background graphics: On


