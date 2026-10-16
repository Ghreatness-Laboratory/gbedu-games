import React from 'react';
import { WordPlayGame } from '../word-play/WordPlayGame';

export const WordGbeduGame: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return <WordPlayGame onBack={onBack} />;
};
