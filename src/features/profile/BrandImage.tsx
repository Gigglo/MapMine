import { useState } from "react";
import { Image, type ImageSourcePropType, type ImageStyle, type StyleProp } from "react-native";
import { bundledLogo } from "./branding";

export default function BrandImage({ source, style }: { source: ImageSourcePropType; style: StyleProp<ImageStyle> }) {
  const uri = typeof source === "object" && "uri" in source ? source.uri : undefined;
  const [failed, setFailed] = useState<string>();
  const bundled = !uri || uri === failed;
  return <Image source={bundled ? bundledLogo : source} resizeMode="contain" fadeDuration={0}
    style={style}
    onError={() => { if (uri) setFailed(uri); }} />;
}
