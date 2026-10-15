import React from 'react';
import { Avatar as AvatarJsx } from './Avatar.jsx';
import { AvatarConfig } from '../data/avatarData';

export interface AvatarProps {
  skin?: AvatarConfig['skin'];
  hair?: AvatarConfig['hair'];
  outfit?: AvatarConfig['outfit'];
  accessory?: AvatarConfig['accessory'];
  aura?: AvatarConfig['aura'];
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'preview' | number;
  avatarId?: string;
  config?: AvatarConfig;
  avatarUrl?: string;
  username?: string;
  className?: string;
  interactive?: boolean;
  showAura?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

export const Avatar: React.FC<AvatarProps> = (props) => {
  return <AvatarJsx {...props} />;
};

export default Avatar;
