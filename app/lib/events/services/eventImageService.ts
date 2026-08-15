import { validateOptionalImageFile } from "../../validation";
import * as repository from "../repositories/eventImageRepository";

export const MAX_EVENT_IMAGES = 10;

export const EventImageService = {
  isConfigured: repository.isEventImageUploadConfigured,

  async upload(files: File[], currentCount: number) {
    if (!files.length) return [];
    if (currentCount + files.length > MAX_EVENT_IMAGES) {
      throw new Error(`Events can have up to ${MAX_EVENT_IMAGES} images.`);
    }

    files.forEach((file, index) => {
      const validation = validateOptionalImageFile(file, `Event image ${index + 1}`, 5);
      if (!validation.ok) throw new Error(validation.message);
    });

    const urls: string[] = [];
    for (const file of files) urls.push(await repository.uploadEventImage(file));
    return urls;
  },
};
