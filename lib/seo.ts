import type { Metadata } from "next";

import { siteConfig } from "@/config/site";

type CreatePageMetadataInput = {
  title: string;
  description: string;
  path: string;
  absoluteTitle?: boolean;
  ogImage?: string;
};

export function createPageMetadata({
  title,
  description,
  path,
  absoluteTitle = false,
  ogImage,
}: CreatePageMetadataInput): Metadata {
  const canonicalPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(canonicalPath, siteConfig.url).toString();
  const image = ogImage
    ? new URL(ogImage, siteConfig.url).toString()
    : new URL(siteConfig.ogImage, siteConfig.url).toString();

  return {
    title: absoluteTitle
      ? { absolute: title }
      : title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: absoluteTitle ? title : `${title} | ${siteConfig.name}`,
      description,
      url,
      siteName: siteConfig.name,
      images: [{ url: image }],
      locale: siteConfig.locale,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: absoluteTitle ? title : `${title} | ${siteConfig.name}`,
      description,
      images: [image],
    },
  };
}
