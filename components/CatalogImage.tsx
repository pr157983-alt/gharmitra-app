import { Image, ImageStyle, StyleProp } from 'react-native';
import { catalogSource } from '@/lib/catalogPhotos';

export function CatalogImage({
  name,
  imageUrl,
  style,
}: {
  name: string;
  imageUrl?: string | null;
  style?: StyleProp<ImageStyle>;
}) {
  return (
    <Image
      source={catalogSource(name, imageUrl)}
      style={[{ resizeMode: 'cover', backgroundColor: '#e5e7eb' }, style]}
    />
  );
}
