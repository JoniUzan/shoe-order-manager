# A future mobile app talks to a separate Fastify API, and both apps share one services package

Not built yet. This records the shape we agreed on, so work done before then doesn't close it
off. The mobile app will be native (Expo / React Native) and online only, with no offline order
entry or sync. Today every write is a Server Action, which a native app can't call, so mobile
needs an HTTP API.

The API is its own app, `apps/api`, on Fastify, deployed to Vercel as a Vercel Function (Vercel
runs Fastify with no config) in the same region as the web app. It serves REST, validates
requests with `@repo/domain`'s Zod schemas, and generates an OpenAPI spec from them, which gives
the Expo app a typed client.

The web app doesn't call the API. The business logic moves out of the Server Actions into
`packages/services`: functions like `createOrder(ownerId, input)` that hold the transaction, the
`lockOrder` rule and the derived totals. The web app's Server Actions call them in process, and
`apps/api`'s routes call the same functions for mobile. One copy of the rules, and no extra
network hop for the web app. Each app resolves the User through the shared `packages/auth`
(ADR 0009) and passes `ownerId` in. Scoping stays in app code (ADR 0003).

Moving the logic into `packages/services` is the first PR of the mobile project, not before.
The actions are already `ownerId`-scoped and covered by integration tests (ADR 0006), so the
move is mechanical. Until then, new actions follow the existing pattern.

Considered: API routes inside the Next app, which is one deployable but couples the mobile API
to the web app's deploys and framework. Also having the web app call the API over HTTP, which
gives one path but adds a network hop to every web write and needs a second app to be up. And
tRPC/oRPC, which only TypeScript clients can call comfortably.
