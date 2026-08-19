import { useEffect, useState } from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';
import { catalogPhoto, fallbackPhotoForName } from '@/lib/catalogPhotos';

export function CatalogImage({
  name,
  imageUrl,
  style,
}: {
  name: string;
  imageUrl?: string | null;
  style?: StyleProp<ImageStyle>;
}) {
  const mapped = fallbackPhotoForName(name);
  const [uri, setUri] = useState(catalogPhoto(name, imageUrl));

  useEffect(() => {
    setUri(catalogPhoto(name, imageUrl));
  }, [name, imageUrl]);

  return (
    <Image
      source={{ uri }}
      style={[{ resizeMode: 'cover' }, style]}
      onError={() => {
        if (uri !== mapped) setUri(mapped);
      }}
    />
  );
}
