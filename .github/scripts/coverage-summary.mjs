// Appends a coverage table to the GitHub job summary, from Vitest's
// json-summary reporter: node coverage-summary.mjs <title> <coverage-summary.json>
import { appendFileSync, readFileSync } from "node:fs";

const [title, file] = process.argv.slice(2);
const { total } = JSON.parse(readFileSync(file, "utf8"));
const row = (k) => `| ${k} | ${total[k].pct}% | ${total[k].covered}/${total[k].total} |`;
const table = [
  `### Coverage: ${title}`,
  "",
  "| | % | covered |",
  "|---|---|---|",
  ...["lines", "branches", "functions", "statements"].map(row),
  "",
].join("\n");

console.log(table);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, table);
