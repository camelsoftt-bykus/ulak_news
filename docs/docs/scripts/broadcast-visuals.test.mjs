import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const animation = readFileSync(new URL("../public/animasyon.html", import.meta.url), "utf8");
const renderer = readFileSync(new URL("./render-video.mjs", import.meta.url), "utf8");

test("story index follows the active narration segment", () => {
  const storyIndex = animation.indexOf("currentStoryIndex=Number(segment.index)-1;");
  const audioStart = animation.indexOf("audio.src=segmentAudioUrls[index];");
  assert.notEqual(storyIndex, -1, "story segment must select its corresponding image");
  assert.notEqual(audioStart, -1, "audio segment playback must remain present");
  assert.ok(storyIndex < audioStart, "visual selection must happen before the matching audio starts");
});

test("full-screen visuals require a successfully loaded image", () => {
  assert.match(animation, /item\.broadcastImage&&\s*item\.broadcastImage\.naturalWidth/);
  assert.match(animation, /drawBroadcastImage\(newsSlides\[visualToStoryIndex\],transition\)/);
  assert.match(animation, /visualTransitionStarted\)\/420/);
});

test("missing broadcast visuals fall back to the studio without changing audio", () => {
  assert.match(animation, /const desiredStoryIndex=/);
  assert.match(animation, /\?currentStoryIndex\s*:\s*-1/);
  assert.match(animation, /audio\.src=segmentAudioUrls\[index\];/);
  assert.match(animation, /audio\.play\(\)/);
});

test("video capture waits for broadcast-image loading to finish", () => {
  assert.match(renderer, /ULAK_BROADCAST_IMAGES_READY === true/);
  assert.match(renderer, /broadcast: window\.ULAK_BROADCAST_IMAGE_COUNT \|\| 0/);
  assert.match(renderer, /imageStats\.loaded === 0 && imageStats\.broadcast === 0/);
});
