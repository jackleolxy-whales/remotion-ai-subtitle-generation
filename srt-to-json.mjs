import { readFileSync, writeFileSync } from "fs";
import { basename, join, extname } from "path";

// 简单的 SRT 解析器
function parseSRT(srtContent) {
  const subtitles = [];
  const blocks = srtContent.trim().split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.split("\n");
    if (lines.length < 3) continue;

    // 格式通常是:
    // 1
    // 00:00:00,000 --> 00:00:01,500
    // 字幕内容

    const timeLine = lines[1];
    const text = lines.slice(2).join("\n");

    const [startStr, endStr] = timeLine.split(" --> ");
    
    if (!startStr || !endStr) continue;

    const parseTime = (timeStr) => {
      const [h, m, s] = timeStr.split(":");
      const [sec, ms] = s.split(",");
      return (
        parseInt(h) * 3600 * 1000 +
        parseInt(m) * 60 * 1000 +
        parseInt(sec) * 1000 +
        parseInt(ms)
      );
    };

    const startMs = parseTime(startStr.trim());
    const endMs = parseTime(endStr.trim());

    subtitles.push({
      startMs,
      endMs,
      timestampMs: startMs,
      text: text.trim(),
      confidence: 1.0, // 默认置信度
    });
  }

  return subtitles;
}

const srtFile = process.argv[2];

if (!srtFile) {
  console.log("Usage: node srt-to-json.mjs <path-to-srt-file>");
  process.exit(1);
}

try {
  const content = readFileSync(srtFile, "utf-8");
  const json = parseSRT(content);
  
  const outFile = join(
    process.cwd(), 
    "public", 
    basename(srtFile, extname(srtFile)) + ".json"
  );
  
  writeFileSync(outFile, JSON.stringify(json, null, 2));
  console.log(`Successfully converted ${srtFile} to ${outFile}`);
} catch (e) {
  console.error("Error converting SRT:", e.message);
}
