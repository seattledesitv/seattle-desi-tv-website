import type { PublishingChannel } from "../repositories/publishingPipelineRepository";

export type ChannelMediaAsset = {
  url: string;
  alt: string;
  sourceUrl: string | null;
};

export type ChannelOutputPayload = {
  schemaVersion: 4;
  channel: PublishingChannel;
  title: string;
  edition: string | null;
  summary: string;
  subject: string | null;
  preheader: string | null;
  caption: string | null;
  hashtags: string[];
  html: string | null;
  text: string;
  media: ChannelMediaAsset[];
  sourceSnapshotGeneratedAt: string;
  generatedAt: string;
};
