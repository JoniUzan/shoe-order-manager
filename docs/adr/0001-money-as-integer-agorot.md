# Money is stored as integer agorot

Every amount (prices, totals, payments) is an `Int` of agorot (1 ₪ = 100 agorot), never a float or a Postgres `Decimal`. Floats drift when summed, and `Decimal` comes back from Prisma as an object that has to be converted everywhere it's touched; plain integers sum exactly and serialize as numbers. Conversion happens only at the UI edge, through `@repo/domain/money`. An `Int` column caps one amount at about ₪21.4 million (`MAX_AGOROT`), far above a wholesale order.
