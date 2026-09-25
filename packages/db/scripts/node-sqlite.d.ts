// `node:sqlite` ships with Node 22.5+, but this workspace's @types/node is v20,
// which predates it. Just the surface copy-sqlite-to-postgres.ts uses.
declare module "node:sqlite" {
  export class DatabaseSync {
    constructor(path: string, options?: { readOnly?: boolean });
    prepare(sql: string): {
      all(): unknown[];
      get(): unknown;
    };
    close(): void;
  }
}
