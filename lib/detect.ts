// lib/detect.ts
// Thin wrapper around TensorFlow.js + the COCO-SSD model.
// Everything runs on-device in the browser — no server, no API key.

export type Detection = {
  class: string;
  score: number;
  // [x, y, width, height] in pixels, relative to the image's natural size
  bbox: [number, number, number, number];
};

// Minimal shape of what @tensorflow-models/coco-ssd gives us back.
type CocoModel = {
  detect: (
    img: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
  ) => Promise<{ class: string; score: number; bbox: [number, number, number, number] }[]>;
};

let modelPromise: Promise<CocoModel> | null = null;

export async function loadModel(): Promise<CocoModel> {
  if (!modelPromise) {
    modelPromise = (async () => {
      const tf = await import("@tensorflow/tfjs");
      await tf.ready();
      const cocoSsd = await import("@tensorflow-models/coco-ssd");
      const model = await cocoSsd.load({ base: "mobilenet_v2" });
      return model as unknown as CocoModel;
    })();
  }
  return modelPromise;
}

const MIN_CONFIDENCE = 0.55;

export async function detectObjects(
  input: HTMLImageElement | HTMLCanvasElement
): Promise<Detection[]> {
  const model = await loadModel();
  const predictions = await model.detect(input);
  return predictions
    .filter((p) => p.score >= MIN_CONFIDENCE)
    .map((p) => ({ class: p.class, score: p.score, bbox: p.bbox }));
}
