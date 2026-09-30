# Order PDFs are rendered on the server with @react-pdf/renderer

An order has two PDFs: the order summary for the Customer and the Production sheet for the factory.
Both come from a server route that builds a real PDF with `@react-pdf/renderer`, with a
Hebrew font embedded. The order page's PDF menu shares, downloads or opens that file; there is
no HTML print page any more, and printing is the browser's PDF viewer printing the same file.

Before this, the PDF was a picture: `html2canvas` captured the `/print` page in the browser and
`jsPDF` wrapped the JPEG. It rendered Hebrew and RTL for free because the browser did the
layout, but the text was a blurry image that couldn't be searched, page breaks cut rows in half,
and getting a file meant going to a separate page first. In practice the Print button got used,
and that gave no file at all.

We ruled out headless Chromium on the server. It would print the existing HTML with perfect
RTL, but it is a ~50MB binary with slow cold starts on serverless hosting. We also ruled out
keeping the browser capture and only moving it onto the order page: it would fix the extra
step, but not the picture quality or the page breaks.

The price is that the PDF layout is written in react-pdf's own primitives, separately from the
web UI, and react-pdf does not do bidi on its own. Mixed runs (Hebrew text next to sizes, SKUs,
phone numbers and ₪ amounts) have to be split into direction-explicit pieces by us, and each
PDF's layout is laid out right-to-left by hand for Hebrew. A wrong run shows up as scrambled
text in the file, so the e2e suites check the generated PDFs in both locales.
