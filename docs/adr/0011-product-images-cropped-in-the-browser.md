# Product images are cropped in the browser and stored by key in S3

A Shoe model has one Product image, shown in the catalog, the order form, the order page and
both PDFs. The browser crops the picked photo to its centre square, scales it to at most 1024px
and encodes a JPEG (`cropToSquareJpeg`, from `@repo/domain`'s `squareCrop`) before anything is
uploaded. When the model is saved, a Server Action (`uploadProductImage`) checks that it got a
JPEG under 1.5MB and puts it in the bucket under `products/<ownerId>/<random uuid>.jpg`. The
form then saves that key with the model. The database holds only the key (ADR 0008), and
`imageUrl()` adds `IMAGE_BASE_URL` when a page renders.

**Why the browser does the work.** A phone photo is 3–10MB. Cropping it first keeps the upload
to a few hundred KB, under Vercel's request body limit, so it can go through an ordinary Server
Action with no presigned URLs and no CORS rules on the bucket. It also needs no image library
on the server, where `sharp` would mean a native binary on serverless hosting. What the User
sees in the form is exactly the file that gets stored. The server still checks the type and
size itself, because a request can skip the browser.

**Why JPEG and not WebP.** The PDFs embed the same file, and react-pdf reads only JPEG and PNG.
One format everywhere avoids storing a second copy.

**Why upload on save, not on pick.** A photo picked and then abandoned with the form never
reaches the bucket. A failed save after a good upload keeps the key, so trying again doesn't
upload twice. Replacing or removing an image, or deleting its model, deletes the old file once
the database write has committed. A failed delete only leaves an unused file behind, so it is
logged, not thrown.

**Keys.** Each upload gets a new random name, so a key is never overwritten. Files can then be
cached forever (`immutable`), and the URL can be public without being guessable. The User's id
in the path lets an action check, from the key alone, that a key the browser sent is the User's
own (`isOwnProductImageKey`).

**Local storage is SeaweedFS.** ADR 0008 said MinIO locally, but MinIO stopped publishing
community images in 2025. SeaweedFS speaks the same S3 API, runs as one container
(`docker compose up -d` starts it, and the dev bucket with it), and CI runs the same image. The
app only knows `S3_*` env vars, so the local server can change again without touching code.

Considered: presigned PUTs straight from the browser to R2. That avoids passing the bytes
through the app, but it needs bucket CORS on every environment and a second request to confirm
the upload. With files this small, there was nothing to gain. Also considered: resizing on the
server with `sharp`, which accepts any format (HEIC included) but brings a native dependency.
Safari already hands HEIC photos to the page as JPEG.
