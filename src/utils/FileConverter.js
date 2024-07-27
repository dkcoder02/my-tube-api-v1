import { exec } from "child_process";
import ffmpegPath from "ffmpeg-static";

// Function to convert MKV to MP4
function convertToMP4(inputFile, outputFile) {
  return new Promise((resolve, reject) => {
    const command = `"${ffmpegPath}" -i "${inputFile}" -c:v copy -c:a aac -strict experimental "${outputFile}"`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error converting file: ${error.message}`);
        reject(error);
      } else {
        console.log(`File converted successfully: ${outputFile}`);
        resolve(outputFile);
      }
    });
  });
}

// Usage
const inputFile = "input.mkv";
const outputFile = "output.mp4";

convertToMP4(inputFile, outputFile)
  .then((res) => {
    console.log("Conversion complete.", res);
  })
  .catch((error) => {
    console.error("Conversion failed:", error);
  });
