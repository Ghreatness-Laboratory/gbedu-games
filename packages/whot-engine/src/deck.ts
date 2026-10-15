import { Card, Shape, SpecialEffectType } from '@gbedu/shared';

// Standard 54-Card Nigerian Whot Deck
// Circle (12): 1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14
// Triangle (12): 1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14
// Cross (9): 1, 2, 3, 5, 7, 10, 11, 13, 14
// Square (9): 1, 2, 3, 5, 7, 10, 11, 13, 14
// Star (7): 1, 2, 3, 4, 5, 7, 8
// Whot 20 (5 cards)
export function createStandardDeck(): Card[] {
  const cards: Card[] = [];

  const addCards = (shape: Shape, numbers: number[]) => {
    numbers.forEach((num, index) => {
      let specialType: SpecialEffectType | undefined;
      if (num === 1) specialType = 'hold_on';
      else if (num === 2) specialType = 'pick_two';
      else if (num === 5) specialType = 'pick_three';
      else if (num === 8) specialType = 'suspension';
      else if (num === 14) specialType = 'general_market';

      cards.push({
        id: `${shape}_${num}_${index}`,
        shape,
        number: num,
        specialType,
      });
    });
  };

  // Circles (12)
  addCards('circle', [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14]);

  // Triangles (12)
  addCards('triangle', [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14]);

  // Crosses (9)
  addCards('cross', [1, 2, 3, 5, 7, 10, 11, 13, 14]);

  // Squares (9)
  addCards('square', [1, 2, 3, 5, 7, 10, 11, 13, 14]);

  // Stars (7)
  addCards('star', [1, 2, 3, 4, 5, 7, 8]);

  // Whot 20 (5)
  for (let i = 0; i < 5; i++) {
    cards.push({
      id: `whot_20_${i}`,
      shape: 'whot',
      number: 20,
      specialType: 'whot',
    });
  }

  return cards;
}

// Fisher-Yates shuffle with optional injectable RNG for deterministic test cases
export function shuffleDeck(deck: Card[], rng: () => number = Math.random): Card[] {
  const result = [...deck];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
