# A pack's pairs are ordinary line items, and the order keeps a snapshot of the pack

When an order takes N cartons of a pack, the server writes one `OrderPack` row (the pack's name and curve copied in, plus the count) and one ordinary `OrderItem` per size with `quantity = count × pairs` and `packId` set. Totals, reports and picking keep summing items and never need to understand packs, and editing or deleting the catalog pack later never changes what an old order says was sold. The client sends only which pack and how many; the server builds the items from the stored curve (`resolvePacks`), so a client can't send a curve that disagrees with the catalog.

## Considered options

- Store only `OrderPack` and expand it when reading: every total, report and print path would need to know about packs.
- Reference the catalog pack without a snapshot: editing a pack would silently rewrite past orders.
