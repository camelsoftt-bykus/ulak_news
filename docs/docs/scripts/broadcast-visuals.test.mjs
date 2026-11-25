import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const animation = readFileSync(new URL("../public/animasyon.html", import.meta.url), "utf8");
const renderer = readFileSync(new URL("./render-video.mjs", import.meta.url), "utf8");
const tts = readFileSync(new URL("../app/api/tts/route.ts", import.meta.url), "utf8");

test("story index follows the active narration segment", () => {
  const storyIndex = animation.indexOf("currentStoryIndex=Number(segment.index)-1;");
  const audioStart = animation.indexOf("audio.src=segmentAudioUrls[index];");
  assert.notEqual(storyIndex, -1, "story segment must select its corresponding visual");
  assert.notEqual(audioStart, -1, "audio segment playback must remain present");
  assert.ok(storyIndex < audioStart, "visual selection must happen before the matching audio starts");
});

test("every story has a full-screen photo or a branded graphic card", () => {
  assert.match(animation, /const photo=item\.broadcastImage;/);
  assert.match(animation, /if\(hasPhoto\)/);
  assert.match(animation, /Haber kartı · Fotoğraf bulunamadı/);
  assert.match(animation, /drawBroadcastImage\(newsSlides\[visualToStoryIndex\],transition\)/);
  assert.match(animation, /visualTransitionStarted\)\/420/);
});

test("missing broadcast photos use a card without changing audio playback", () => {
  assert.match(animation, /const desiredStoryIndex=/);
  assert.match(animation, /currentStoryIndex>=0&&newsSlides\[currentStoryIndex\]/);
  assert.match(animation, /audio\.src=segmentAudioUrls\[index\];/);
  assert.match(animation, /audio\.play\(\)/);
});

test("video capture waits for image loading and allows branded card fallbacks", () => {
  assert.match(renderer, /ULAK_BROADCAST_IMAGES_READY === true/);
  assert.match(renderer, /broadcast: window\.ULAK_BROADCAST_IMAGE_COUNT \|\| 0/);
  assert.match(renderer, /fallbackCardCount = Math\.max\(0, daily\.news\.length - imageStats\.broadcast\)/);
  assert.doesNotMatch(renderer, /Görselleri eksik bülten yayımlanmayacak/);
});

test("TTS keeps the ULAK brand name and does not add a presenter identity", () => {
  assert.match(tts, /pronounce it clearly as 'U-lak'/);
  assert.match(tts, /without adding an introduction or identifying yourself by a personal name/);
});
