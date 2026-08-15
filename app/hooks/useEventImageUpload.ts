"use client";

import { useState } from "react";
import { EventImageService } from "../lib/events/services/eventImageService";

export function useEventImageUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function upload(files: File[], currentCount: number) {
    setUploading(true);
    setError("");
    try {
      return await EventImageService.upload(files, currentCount);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not upload event images.";
      setError(message);
      throw caught;
    } finally {
      setUploading(false);
    }
  }

  return { upload, uploading, error, configured: EventImageService.isConfigured() };
}
