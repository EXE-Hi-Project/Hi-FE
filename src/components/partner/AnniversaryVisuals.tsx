import { Icon as IconifyIcon } from '@iconify/react/offline';
import airplane from '@iconify-icons/fluent-emoji-flat/airplane';
import blossom from '@iconify-icons/fluent-emoji-flat/blossom';
import cameraWithFlash from '@iconify-icons/fluent-emoji-flat/camera-with-flash';
import clapperBoard from '@iconify-icons/fluent-emoji-flat/clapper-board';
import clinkingBeerMugs from '@iconify-icons/fluent-emoji-flat/clinking-beer-mugs';
import crescentMoon from '@iconify-icons/fluent-emoji-flat/crescent-moon';
import heartSuit from '@iconify-icons/fluent-emoji-flat/heart-suit';
import heartWithRibbon from '@iconify-icons/fluent-emoji-flat/heart-with-ribbon';
import houseWithGarden from '@iconify-icons/fluent-emoji-flat/house-with-garden';
import key from '@iconify-icons/fluent-emoji-flat/key';
import ring from '@iconify-icons/fluent-emoji-flat/ring';
import sparkles from '@iconify-icons/fluent-emoji-flat/sparkles';
import teddyBear from '@iconify-icons/fluent-emoji-flat/teddy-bear';
import wrappedGift from '@iconify-icons/fluent-emoji-flat/wrapped-gift';
import {
  AirplaneTilt,
  Cake,
  Camera,
  Confetti,
  FilmSlate,
  Flower,
  ForkKnife,
  Heart,
  House,
  PawPrint,
  Star,
  Wine,
} from '@phosphor-icons/react';

const STICKERS = {
  heart: heartSuit,
  ring,
  flower: blossom,
  moon: crescentMoon,
  sparkles,
  ribbon: heartWithRibbon,
  beer: clinkingBeerMugs,
  airplane,
  movie: clapperBoard,
  gift: wrappedGift,
  camera: cameraWithFlash,
  teddy: teddyBear,
  house: houseWithGarden,
  key,
};

interface AnniversaryVisualProps {
  name?: string;
  className?: string;
  size?: number;
}

export function AnniversarySticker({ name = 'heart', className = '', size = 28 }: AnniversaryVisualProps) {
  const icon = STICKERS[name as keyof typeof STICKERS] ?? STICKERS.heart;
  return <IconifyIcon icon={icon} width={size} height={size} className={className} aria-hidden="true" />;
}

export function AnniversarySymbol({ name = 'favorite', className = '', size = 18 }: AnniversaryVisualProps) {
  const props = { size, className, weight: 'fill' as const, 'aria-hidden': true };

  switch (name) {
    case 'celebration': return <Confetti {...props} />;
    case 'cake': return <Cake {...props} />;
    case 'local_florist': return <Flower {...props} />;
    case 'photo_camera': return <Camera {...props} />;
    case 'star': return <Star {...props} />;
    case 'flight': return <AirplaneTilt {...props} />;
    case 'restaurant': return <ForkKnife {...props} />;
    case 'movie': return <FilmSlate {...props} />;
    case 'home': return <House {...props} />;
    case 'pets': return <PawPrint {...props} />;
    case 'wine_bar': return <Wine {...props} />;
    default: return <Heart {...props} />;
  }
}
