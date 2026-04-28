import { fal } from "@fal-ai/client";

fal.config({
  credentials: process.env.FAL_KEY,
});

export type GeneratePanelInput = {
  prompt: string;
  referenceImageUrl: string;
  width?: number;
  height?: number;
};

export async function generatePanel({
  prompt,
  referenceImageUrl,
  width = 960,
  height = 960,
}: GeneratePanelInput): Promise<string> {
  const result = await fal.subscribe("fal-ai/flux-pulid", {
    input: {
      prompt,
      reference_image_url: referenceImageUrl,
      image_size: { width, height },
      num_inference_steps: 20,
      guidance_scale: 4,
      true_cfg: 1,
      id_weight: 1,
    },
    logs: false,
  });

  const url = (result.data as { images?: Array<{ url: string }> }).images?.[0]
    ?.url;
  if (!url) throw new Error("No image returned from Fal.ai");
  return url;
}
