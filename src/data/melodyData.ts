import { MelodyChallenge } from '../types';

export const MELODY_CHALLENGES: MelodyChallenge[] = [
  {
    id: 'm1',
    title: 'Track #1: The Ojuelegba Horns & Melody',
    artist: 'Wizkid',
    genre: 'Afrobeats Classic',
    notes: [
      { freq: 440, duration: 0.3 },   // A4
      { freq: 493.88, duration: 0.3 },// B4
      { freq: 554.37, duration: 0.4 },// C#5
      { freq: 493.88, duration: 0.3 },// B4
      { freq: 440, duration: 0.5 },   // A4
      { freq: 369.99, duration: 0.4 },// F#4
      { freq: 440, duration: 0.6 }    // A4
    ],
    options: ['Wizkid - Ojuelegba', 'Burna Boy - Ye', 'Davido - If', 'Rema - Dumebi'],
    correctAnswer: 'Wizkid - Ojuelegba',
    hint: 'A 2014 classic celebrating the hustle on the streets of Surulere, Lagos.'
  },
  {
    id: 'm2',
    title: 'Track #2: The Global Rave Hook',
    artist: 'Rema',
    genre: 'Afro-Rave',
    notes: [
      { freq: 659.25, duration: 0.25 }, // E5
      { freq: 587.33, duration: 0.25 }, // D5
      { freq: 523.25, duration: 0.35 }, // C5
      { freq: 440.0, duration: 0.3 },   // A4
      { freq: 523.25, duration: 0.35 }, // C5
      { freq: 587.33, duration: 0.4 },  // D5
      { freq: 659.25, duration: 0.6 }   // E5
    ],
    options: ['Rema - Calm Down', 'Asake - 2:30', 'Omah Lay - Holy Ghost', 'Fireboy DML - Peru'],
    correctAnswer: 'Rema - Calm Down',
    hint: 'The infectious melody that captivated the entire world from Lagos to Los Angeles.'
  },
  {
    id: 'm3',
    title: 'Track #3: The Unstoppable Amapiano Anthem',
    artist: 'Asake',
    genre: 'Fuji-Amapiano',
    notes: [
      { freq: 329.63, duration: 0.2 }, // E4
      { freq: 392.0, duration: 0.2 },  // G4
      { freq: 440.0, duration: 0.3 },  // A4
      { freq: 523.25, duration: 0.25 },// C5
      { freq: 440.0, duration: 0.35 }, // A4
      { freq: 392.0, duration: 0.3 },  // G4
      { freq: 329.63, duration: 0.5 }  // E4
    ],
    options: ['Asake - Lonely At The Top', 'Kizz Daniel - Buga', 'Burna Boy - City Boys', 'Davido - Feel'],
    correctAnswer: 'Asake - Lonely At The Top',
    hint: 'Reflective, soulful anthem reminding everyone to protect their peace at the pinnacle.'
  },
  {
    id: 'm4',
    title: 'Track #4: Fela\'s Golden Shrine Brass',
    artist: 'Fela Kuti',
    genre: 'Roots Afrobeat',
    notes: [
      { freq: 293.66, duration: 0.35 }, // D4
      { freq: 349.23, duration: 0.35 }, // F4
      { freq: 392.0, duration: 0.4 },   // G4
      { freq: 440.0, duration: 0.3 },   // A4
      { freq: 392.0, duration: 0.3 },   // G4
      { freq: 349.23, duration: 0.4 },  // F4
      { freq: 293.66, duration: 0.7 }   // D4
    ],
    options: ['Fela Kuti - Water No Get Enemy', 'Tony Allen - Afro Disco', 'King Sunny Ade - Ja Funmi', 'William Onyeabor - Atomic Bomb'],
    correctAnswer: 'Fela Kuti - Water No Get Enemy',
    hint: 'Philosophical Afrobeat masterwork stating that nobody can ever fight against water.'
  }
];
