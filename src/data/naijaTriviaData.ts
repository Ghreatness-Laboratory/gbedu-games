export interface TriviaQuestion {
  id: string;
  category: 'History' | 'Geography' | 'Music & Culture' | 'Nollywood' | 'Sports' | 'Food & Festivities' | 'Pidgin & Slang';
  question: string;
  options: string[];
  correctIndex: number;
  funFact: string;
  hint: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export const NAIJA_TRIVIA_QUESTIONS: TriviaQuestion[] = [
  // 1. History & Independence
  {
    id: 'h1',
    category: 'History',
    question: 'In what year did Nigeria officially gain independence from British colonial rule?',
    options: ['1957', '1960', '1963', '1966'],
    correctIndex: 1,
    funFact: 'Nigeria gained independence on October 1, 1960. Alhaji Sir Abubakar Tafawa Balewa became the first Prime Minister.',
    hint: 'Celebrated annually on the first day of October.',
    difficulty: 'easy',
  },
  {
    id: 'h2',
    category: 'History',
    question: 'Who coined the name "Nigeria" in an article published in The Times of London in 1897?',
    options: ['Queen Victoria', 'Flora Shaw', 'Lord Frederick Lugard', 'Mary Slessor'],
    correctIndex: 1,
    funFact: 'Flora Shaw, who later married colonial administrator Lord Lugard, coined the name inspired by the mighty River Niger.',
    hint: 'A British journalist who later became Lady Lugard.',
    difficulty: 'medium',
  },
  {
    id: 'h3',
    category: 'History',
    question: 'Which legendary 16th-century warrior queen ruled the Hausa kingdom of Zazzau (modern-day Zaria)?',
    options: ['Queen Amina', 'Queen Idia', 'Moremi Ajasoro', 'Emotan'],
    correctIndex: 0,
    funFact: 'Queen Amina built extensive defensive earthen walls around Hausa cities, known to this day as Ganuwar Amina (Amina\'s walls).',
    hint: 'Known for fierce cavalry warfare and protective fortified walls.',
    difficulty: 'easy',
  },
  {
    id: 'h4',
    category: 'History',
    question: 'The ancient Nok culture, celebrated for its exquisite terracotta sculptures dating back to 500 BC, was located in which present-day Nigerian state?',
    options: ['Kaduna State', 'Edo State', 'Enugu State', 'Ogun State'],
    correctIndex: 0,
    funFact: 'Nok terracotta heads represent some of the oldest sub-Saharan African iron-smelting civilizations in human history.',
    hint: 'Located in north-central Nigeria near the Jos plateau border.',
    difficulty: 'medium',
  },
  {
    id: 'h5',
    category: 'History',
    question: 'Who served as Nigeria’s first President when the country transitioned into a Federal Republic in 1963?',
    options: ['Chief Obafemi Awolowo', 'Dr. Nnamdi Azikiwe', 'Sir Ahmadu Bello', 'General Yakubu Gowon'],
    correctIndex: 1,
    funFact: 'Dr. Nnamdi Azikiwe, fondly called "Zik of Africa", was an ardent pan-Africanist and advocate for Nigerian self-determination.',
    hint: 'Fondly referred to as "Zik of Africa".',
    difficulty: 'easy',
  },
  {
    id: 'h6',
    category: 'History',
    question: 'Which Scottish missionary is revered across Calabar for stopping the traditional killing of twins in the late 19th century?',
    options: ['David Livingstone', 'Mary Slessor', 'William Carey', 'Mother Teresa'],
    correctIndex: 1,
    funFact: 'Mary Slessor lived deeply among the Efik people, adopted orphaned twins, and learned the local language fluently.',
    hint: 'Her commemorative statue stands proudly in Calabar, Cross River.',
    difficulty: 'easy',
  },

  // 2. Geography & States
  {
    id: 'g1',
    category: 'Geography',
    question: 'At which historic Nigerian city do the Niger and Benue rivers form their famous Y-shaped confluence?',
    options: ['Makurdi', 'Lokoja', 'Onitsha', 'Jebba'],
    correctIndex: 1,
    funFact: 'Lokoja, capital of Kogi State, was the first administrative capital of unified Nigeria and is home to Mount Patti.',
    hint: 'The confluence city located in Kogi State.',
    difficulty: 'easy',
  },
  {
    id: 'g2',
    category: 'Geography',
    question: 'How many federating states make up the Federal Republic of Nigeria today?',
    options: ['30 States', '36 States', '38 States', '42 States'],
    correctIndex: 1,
    funFact: 'Nigeria comprises 36 states plus the Federal Capital Territory (FCT) of Abuja.',
    hint: 'There are also 774 local government areas.',
    difficulty: 'easy',
  },
  {
    id: 'g3',
    category: 'Geography',
    question: 'Which massive natural monolith, often depicted on the 100 Naira note, greets visitors entering Abuja from Niger State?',
    options: ['Olumo Rock', 'Zuma Rock', 'Aso Rock', 'Wase Rock'],
    correctIndex: 1,
    funFact: 'Zuma Rock stands 725 meters above its surroundings and displays a natural facial profile carved by weathering.',
    hint: 'Known as the "Gateway to Abuja" with a natural face appearance.',
    difficulty: 'easy',
  },
  {
    id: 'g4',
    category: 'Geography',
    question: 'What is the name of the famous 11.8 km bridge connecting Lagos Island to the mainland across Lagos Lagoon?',
    options: ['Carter Bridge', 'Eko Bridge', 'Third Mainland Bridge', 'Lekki-Ikoyi Link Bridge'],
    correctIndex: 2,
    funFact: 'Commissioned by President Ibrahim Babangida in 1990, it was the longest bridge in Africa until 1996.',
    hint: 'The third of the trio of bridges connecting Lagos island.',
    difficulty: 'easy',
  },
  {
    id: 'g5',
    category: 'Geography',
    question: 'In which state is the renowned Ikogosi Warm Springs, where warm and cold springs flow side by side without mixing?',
    options: ['Osun State', 'Ekiti State', 'Ondo State', 'Oyo State'],
    correctIndex: 1,
    funFact: 'Geologists come from around the world to study Ikogosi, where warm water (70°C) and cold water (37°C) meet at a single confluence.',
    hint: 'Located in the hilly heart of fountain-of-knowledge state.',
    difficulty: 'medium',
  },

  // 3. Music, Afrobeats & Culture
  {
    id: 'm1',
    category: 'Music & Culture',
    question: 'Which pioneer founded the Kalakuta Republic and created Afrobeat with his band Africa 70 at the New Afrika Shrine?',
    options: ['King Sunny Ade', 'Fela Anikulapo Kuti', 'Fatai Rolling Dollar', 'Oliver De Coque'],
    correctIndex: 1,
    funFact: 'Fela Kuti’s music combined highlife, jazz, funk, and fearless anti-corruption activism that inspired generations of African creators.',
    hint: 'The Abami Eda who composed "Water No Get Enemy".',
    difficulty: 'easy',
  },
  {
    id: 'm2',
    category: 'Music & Culture',
    question: 'Which Afrobeats superstar won the Grammy for Best Global Music Album in 2021 for "Twice as Tall"?',
    options: ['Wizkid', 'Davido', 'Burna Boy', 'Tiwa Savage'],
    correctIndex: 2,
    funFact: 'Burna Boy, the African Giant, performed at Madison Square Garden and London Stadium, selling out arenas worldwide.',
    hint: 'Hails from Port Harcourt and calls himself the African Giant.',
    difficulty: 'easy',
  },
  {
    id: 'm3',
    category: 'Music & Culture',
    question: 'Rema’s smash hit "Calm Down" reached the top 3 on the Billboard Hot 100 after a remix featuring which American pop icon?',
    options: ['Beyoncé', 'Selena Gomez', 'Ariana Grande', 'Rihanna'],
    correctIndex: 1,
    funFact: 'The song became the longest-charting African song in Billboard history, staying over 50 consecutive weeks on the Hot 100.',
    hint: 'Former Disney star and Rare Beauty founder.',
    difficulty: 'easy',
  },
  {
    id: 'm4',
    category: 'Music & Culture',
    question: 'What traditional Yoruba percussion genre did Asake fuse with South African Amapiano log drums to dominate streaming charts?',
    options: ['Juju Music', 'Fuji Music', 'Apala Music', 'Afro-Rock'],
    correctIndex: 1,
    funFact: 'Asake\'s distinctive choral harmonies and Fuji swagger revived street enthusiasm for indigenous Nigerian vocal arrangements.',
    hint: 'Pioneered by Sikiru Ayinde Barrister and Kollington Ayinla.',
    difficulty: 'medium',
  },
  {
    id: 'm5',
    category: 'Music & Culture',
    question: 'Which female Afrobeats pioneer, often called "Mama Africa", was honored with an honorary doctorate and dubbed the Queen of Afrobeats?',
    options: ['Yemi Alade', 'Tiwa Savage', 'Simi', 'Ayra Starr'],
    correctIndex: 1,
    funFact: 'Tiwa Savage became the first woman to win Best African Act at the MTV Europe Music Awards in 2018.',
    hint: 'Sang "Kele Kele Love" and performed at King Charles III\'s coronation concert.',
    difficulty: 'easy',
  },

  // 4. Nollywood & Cinema
  {
    id: 'n1',
    category: 'Nollywood',
    question: 'Which groundbreaking 1992 Igbo-language direct-to-video film directed by Chris Obi Rapu launched modern Nollywood?',
    options: ['Living in Bondage', 'Nneka The Pretty Serpent', 'Osuofia in London', 'Glamour Girls'],
    correctIndex: 0,
    funFact: 'Kenneth Nnebue produced "Living in Bondage" on VHS cassettes using unsold blank tapes, selling hundreds of thousands of copies on Idumota street.',
    hint: 'Told the dark supernatural story of Andy Okeke and Chief Omego.',
    difficulty: 'medium',
  },
  {
    id: 'n2',
    category: 'Nollywood',
    question: 'Which Nigerian film directed by Genevieve Nnaji became Netflix’s first acquired Nigerian original film in 2018?',
    options: ['The Wedding Party', 'Lionheart', 'King of Boys', 'Fifty'],
    correctIndex: 1,
    funFact: 'Lionheart premiered at the 2018 Toronto International Film Festival and was selected as Nigeria’s submission for the Oscars.',
    hint: 'Set in Enugu, revolving around a female executive managing her father\'s bus transport firm.',
    difficulty: 'easy',
  },
  {
    id: 'n3',
    category: 'Nollywood',
    question: 'Which blockbuster created by Funke Akindele became the first Nigerian film to gross over 1 billion Naira at the domestic box office?',
    options: ['Battle on Buka Street', 'Omo Ghetto: The Saga', 'A Tribe Called Judah', 'The Wedding Party 2'],
    correctIndex: 2,
    funFact: 'Released in December 2023, "A Tribe Called Judah" shattered domestic cinema attendance records across West Africa.',
    hint: 'Follows a mother and her five sons from different fathers executing a heist.',
    difficulty: 'easy',
  },
  {
    id: 'n4',
    category: 'Nollywood',
    question: 'Which acclaimed director created cinematic masterpieces like "The Figurine", "October 1", and "Aníkúlápó"?',
    options: ['Kunle Afolayan', 'Tunde Kelani', 'Kemi Adetiba', 'Biyi Bandele'],
    correctIndex: 0,
    funFact: 'Kunle Afolayan\'s father Adeyemi Afolayan (Ade Love) was a pioneering traveling theater and celluloid filmmaker.',
    hint: 'Leading pioneer of the "New Nollywood" cinema movement.',
    difficulty: 'easy',
  },

  // 5. Sports & Super Eagles
  {
    id: 's1',
    category: 'Sports',
    question: 'In what historic Olympic Games did the Nigerian Under-23 football team ("The Dream Team") win Olympic Gold, defeating Brazil and Argentina?',
    options: ['Barcelona 1992', 'Atlanta 1996', 'Sydney 2000', 'Beijing 2008'],
    correctIndex: 1,
    funFact: 'Nwankwo Kanu scored two legendary late goals against Brazil in the semifinal, leading to the Golden Goal rule victory.',
    hint: 'The Centennial Olympic Games held in the USA.',
    difficulty: 'easy',
  },
  {
    id: 's2',
    category: 'Sports',
    question: 'Which midfield magician is famous for the saying: "So good that they named him twice"?',
    options: ['Sunday Oliseh', 'Jay-Jay Okocha', 'Finidi George', 'Daniel Amokachi'],
    correctIndex: 1,
    funFact: 'Augustine "Jay-Jay" Okocha dazzled at Eintracht Frankfurt, PSG, and Bolton Wanderers, famous for dribbling Oliver Kahn.',
    hint: 'Super Eagles number 10 renowned for rainbow flicks and stepovers.',
    difficulty: 'easy',
  },
  {
    id: 's3',
    category: 'Sports',
    question: 'Who scored Nigeria’s very first World Cup goal against Bulgaria at USA 1994, celebrating inside the goal net?',
    options: ['Rashidi Yekini', 'Emmanuel Amunike', 'Samson Siasia', 'Daniel Amokachi'],
    correctIndex: 0,
    funFact: 'Rashidi Yekini held the goal net in tears in Dallas, creating one of the most iconic photographs in World Cup history.',
    hint: 'Nigeria\'s all-time leading international goalscorer with 37 goals.',
    difficulty: 'easy',
  },
  {
    id: 's4',
    category: 'Sports',
    question: 'Which Nigerian female footballer has won the CAF African Women’s Footballer of the Year award a record 6 times?',
    options: ['Perpetua Nkwocha', 'Asisat Oshoala', 'Chiamaka Nnadozie', 'Francisca Ordega'],
    correctIndex: 1,
    funFact: 'Asisat "Agba Baller" Oshoala won UEFA Women’s Champions League titles with FC Barcelona and scored in three World Cups.',
    hint: 'Nicknamed "Agba Baller" by Nigerian fans.',
    difficulty: 'easy',
  },
  {
    id: 's5',
    category: 'Sports',
    question: 'What is the proud nickname of the Nigerian Senior Women’s National Basketball Team who made history reaching the Olympic quarterfinals in 2024?',
    options: ['Super Falcons', 'D\'Tigress', 'Flamingos', 'Falconets'],
    correctIndex: 1,
    funFact: 'Coached by Rena Wakama, D\'Tigress became the first African basketball team (men or women) in Olympic history to reach the quarterfinals.',
    hint: 'The female equivalent of D\'Tigers.',
    difficulty: 'easy',
  },

  // 6. Food, Festivals & Culture
  {
    id: 'f1',
    category: 'Food & Festivities',
    question: 'What aromatic, peppery spice mixture made with ground ginger, kuli-kuli, and chili peppers coats authentic northern Suya meat?',
    options: ['Curry Powder', 'Yaji Spice', 'Iru', 'Thyme Rub'],
    correctIndex: 1,
    funFact: 'Yaji seasoning contains ground roasted groundnut paste (kuli-kuli), dried ginger, cloves, garlic, and hot bird’s eye chili.',
    hint: 'The secret weapon of Mai Suya street vendors.',
    difficulty: 'easy',
  },
  {
    id: 'f2',
    category: 'Food & Festivities',
    question: 'Which glamorous annual festival in Ijebu-Ode, Ogun State, takes place on the third day of Eid-el-Kabir with opulent horse parades and designer agbada?',
    options: ['Argungu Fishing Festival', 'Ojude Oba Festival', 'Eyo Festival', 'Osun-Osogbo Festival'],
    correctIndex: 1,
    funFact: 'Ojude Oba ("The King\'s Forecourt") showcases royal horse-riding families and generational aristocratic families honoring the Awujale of Ijebuland.',
    hint: 'Celebrated in Ijebuland and famous on social media for high-fashion royal displays.',
    difficulty: 'medium',
  },
  {
    id: 'f3',
    category: 'Food & Festivities',
    question: 'In the great West African Jollof rice debate, what gives authentic Nigerian Party Jollof its signature smoky aroma and taste?',
    options: ['Wood-fire cooking and deliberate bottom-pot charring', 'Adding palm wine', 'Pouring coconut cream', 'Steaming with banana leaves'],
    correctIndex: 0,
    funFact: 'Party caterers use cast iron pots over open firewood so the trapped steam forces the tomato-pepper reduction into every rice grain.',
    hint: 'The firewood flame and caramelized bottom-of-the-pot magic.',
    difficulty: 'easy',
  },
  {
    id: 'f4',
    category: 'Food & Festivities',
    question: 'The Argungu International Fishing and Cultural Festival takes place annually in which northern Nigerian state?',
    options: ['Kebbi State', 'Sokoto State', 'Zamfara State', 'Katsina State'],
    correctIndex: 0,
    funFact: 'Thousands of fishermen dive simultaneously into the Matan Fada river equipped only with hand nets and traditional gourds to catch giant Nile perch.',
    hint: 'Located in north-western Nigeria along the Niger border.',
    difficulty: 'medium',
  },

  // 7. Pidgin & Slang
  {
    id: 'p1',
    category: 'Pidgin & Slang',
    question: 'What does the popular Nigerian phrase "No shaking" or "No wahala" translate to in English?',
    options: ['No problem / Everything is calm', 'Stop dancing immediately', 'Earthquake alert', 'Don\'t disturb me'],
    correctIndex: 0,
    funFact: '"No shaking" is an assurance of confidence and serenity in the face of any challenge.',
    hint: 'A comforting response meaning everything is under control.',
    difficulty: 'easy',
  },
  {
    id: 'p2',
    category: 'Pidgin & Slang',
    question: 'If someone in Lagos says you have "Chopped Breakfast", what experience are they sympathizing with you about?',
    options: ['You had free fried plantain and eggs', 'You suffered a painful romantic heartbreak', 'You arrived early for work', 'You won the lottery'],
    correctIndex: 1,
    funFact: 'Popularized heavily in Burna Boy’s smash anthem "Last Last" ("E don cast, last last na everybody go chop breakfast").',
    hint: 'Heartbreak or romantic disappointment.',
    difficulty: 'easy',
  },
  {
    id: 'p3',
    category: 'Pidgin & Slang',
    question: 'In Nigerian slang, calling someone an "Odogwu" signifies that they are what kind of person?',
    options: ['A respected champion, leader, or person of high status and wealth', 'A novice who just arrived in town', 'A DJ who plays Fuji music', 'A bad-tempered driver'],
    correctIndex: 0,
    funFact: '"Odogwu" is an Igbo title meaning "hero" or "great warrior", widely adopted across Nigerian pop culture.',
    hint: 'A heavyweight title for big achievers.',
    difficulty: 'easy',
  },
  {
    id: 'p4',
    category: 'Pidgin & Slang',
    question: 'What does the common Nigerian exclamation "JJC" stand for when describing a newcomer in Lagos?',
    options: ['Johnny Just Come', 'Just Joined Club', 'Junior Junior Cadet', 'Jolly Jolly Cruise'],
    correctIndex: 0,
    funFact: 'Originated in the 1970s describing people newly arriving from rural areas or overseas who are yet to adapt to fast-paced Lagos street smarts.',
    hint: 'A fresh arrival who does not yet understand the city.',
    difficulty: 'easy',
  },
];

// Helper to pick 5 daily questions deterministically for the Daily Quiz mode
export function getDailyTriviaQuestions(): TriviaQuestion[] {
  const now = new Date();
  const dayIndex = Math.floor((now.getTime() - new Date(2025, 0, 1).getTime()) / (1000 * 60 * 60 * 24));
  const pool = [...NAIJA_TRIVIA_QUESTIONS];
  const selected: TriviaQuestion[] = [];

  for (let i = 0; i < 5; i++) {
    const idx = (Math.abs(dayIndex) * 7 + i * 3) % pool.length;
    selected.push(pool[idx]);
  }
  return selected;
}

// Helper to get random 10 questions for Quick Play mode
export function getRandomTriviaRound(count: number = 10): TriviaQuestion[] {
  const shuffled = [...NAIJA_TRIVIA_QUESTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
