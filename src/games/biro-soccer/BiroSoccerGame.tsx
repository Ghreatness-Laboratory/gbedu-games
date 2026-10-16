import React from 'react';
import { BiroBattleGame } from '../biro-battle/BiroBattleGame';

// BiroSoccerGame now renders Biro Battle ("Flick them off the table")
export const BiroSoccerGame: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return <BiroBattleGame onBack={onBack} />;
};

export default BiroSoccerGame;
