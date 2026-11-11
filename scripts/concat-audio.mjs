import ffmpegPath from "ffmpeg-static";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const root = process.cwd();
const audioDir = path.join(root, "temp-walkthrough", "audio");
const outputFile = path.join(root, "temp-walkthrough", "master_narration.mp3");

const segments = [
  "segment1.mp3",
  "segment2.mp3",
  "segment3.mp3",
  "segment4.mp3",
  "segment5.mp3",
];

const listContent = segments
  .map((seg) => `file '${path.join(audioDir, seg).replace(/\\/g, "/")}'`)
  .join("\n");

const listPath = path.join(audioDir, "concat_list.txt");
fs.writeFileSync(listPath, listContent, "utf-8");

console.log("Running ffmpeg concatenation...");
const cmd = `"${ffmpegPath}" -y -f concat -safe 0 -i "${listPath}" -c copy "${outputFile}"`;
execSync(cmd, { stdio: "inherit" });

console.log("Master narration created at:", outputFile);
