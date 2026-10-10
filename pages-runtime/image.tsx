import type { ImgHTMLAttributes } from "react";

type Props = ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; priority?: boolean };
export default function Image({ fill, priority, style, alt, ...props }: Props) {
  // Native images retain the existing fill containers, aspect ratios and CSS.
  // ERP remains responsible for authorizing and serving public vehicle media.
  // eslint-disable-next-line @next/next/no-img-element
  return <img {...props} alt={alt || ""} loading={priority ? "eager" : "lazy"} decoding="async"
    fetchPriority={priority ? "high" : undefined}
    style={fill ? { position: "absolute", height: "100%", width: "100%", inset: 0, ...style } : style} />;
}
