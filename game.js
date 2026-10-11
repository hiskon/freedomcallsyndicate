/*
 * FREEDOM CALL: SYNDICATE — Prototype 0.5 · Combat & Narrative Systems
 * Data-first open-world / narrative architecture.
 * No framework or build step required: plain HTML, CSS and Canvas 2D.
 */
(() => {
  'use strict';

  // ---------------------------------------------------------------------------
  // 1. SHARED EVENTS: decouples world data, quest logic, renderer and UI.
  // ---------------------------------------------------------------------------
  class EventBus {
    constructor() { this.listeners = new Map(); }
    on(name, callback) {
      if (!this.listeners.has(name)) this.listeners.set(name, new Set());
      this.listeners.get(name).add(callback);
      return () => this.listeners.get(name)?.delete(callback);
    }
    emit(name, payload = {}) {
      this.listeners.get(name)?.forEach(callback => callback(payload));
    }
  }
  const events = new EventBus();

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const percent = value => `${Math.round(value)}%`;
  const titleCase = value => value ? value.charAt(0).toUpperCase() + value.slice(1) : '';

  // ---------------------------------------------------------------------------
  // 2. GAME DATA: characters, districts, cells, landmarks and interaction nodes.
  //    New regions can be added here without changing renderer/quest algorithms.
  // ---------------------------------------------------------------------------
  const CHARACTERS = {
    arthur: {
      id: 'arthur', name: 'Arthur', surname: 'Hawthorne', epithet: 'THE BRAWLER',
      role: 'DÖVÜŞÇÜ · ÇETE LİDERİ', monogram: 'A', weapon: 'Muşta · baston bıçak',
      description: 'Ön safta savaşır, çete üyelerini etrafında toplar ve yakın dövüşte baskı kurar.',
      abilityTitle: 'IRON WILL',
      ability: 'Yakın dövüşte daha dayanıklı; ağır saldırılar ve çete çatışmaları için ideal.',
      stats: { health: 92, combat: 94, stealth: 43, agility: 68, hookRange: 64 },
      hookRange: 480, combatStyle: 'brawler',
      signature: 'Kırıcı kombo'
    },
    eleanor: {
      id: 'eleanor', name: 'Eleanor', surname: 'Vale', epithet: 'THE SHADE',
      role: 'SUIKASTÇI · GİZLİLİK UZMANI', monogram: 'E', weapon: 'Fırlatma bıçakları · gizli bıçak',
      description: 'Gölgeleri kullanır, sessizce yaklaşır ve yüksek noktalara daha uzak mesafeden kanca atar.',
      abilityTitle: 'GHOST STEP',
      ability: 'Gelişmiş gizlilik ve daha uzun kanca menzili; keşif ve sessiz giriş için ideal.',
      stats: { health: 74, combat: 72, stealth: 96, agility: 91, hookRange: 98 },
      hookRange: 680, combatStyle: 'assassin',
      signature: 'Sessiz infaz'
    }
  };

  const makeGrid = rows => rows.map(row => Array.from(row.padEnd(14, '.').slice(0, 14)));
  const WORLD_DATA = {
    city: 'London', year: 1868, antagonist: 'Lord Ironford', gang: 'The Iron Cogs',
    gridSize: { columns: 14, rows: 8 },
    districts: {
      whitechapel: {
        id: 'whitechapel', index: '01', name: 'Whitechapel', subtitle: 'Dar sokaklar · işçi evleri · The Iron Cogs',
        boss: 'Kaptan Rook', atmosphere: 'İşçi mahalleleri ve dar geçitler', baseline: 462,
        sky: ['#3b4545', '#202725', '#151915'], ambience: 'smoke',
        description: 'Buhar ve kömür isiyle kararmış işçi evleri. Iron Cogs, pazarın ve eski şapelin çevresini gözetliyor.',
        landmarkSummary: 'Whitechapel Market · St. Jude Şapeli · Eski işçi evleri',
        grid: {
          street: makeGrid(['..............','..BBBB..BBBB..','..B..B..B..B..','RRRRRRRRRRRRRR','..C..G....L...','BBBB..BBBB..BB','BBBB..BBBB..BB','RRRRRRRRRRRRRR']),
          rooftop: makeGrid(['..A....A...A..','..BBBB..BBBB..','..BLLB..B..B..','..A....A...A..','..BBBB..BBBB..','..A....A...A..','..BBBB..BBBB..','..............'])
        },
        buildings: [
          { x: 0, w: 182, h: 205, style: 'terrace', floors: 3 },
          { x: 175, w: 150, h: 248, style: 'chapel', floors: 3 },
          { x: 320, w: 185, h: 218, style: 'terrace', floors: 3 },
          { x: 500, w: 168, h: 230, style: 'pub', floors: 3 },
          { x: 660, w: 210, h: 290, style: 'warehouse', floors: 4 },
          { x: 865, w: 165, h: 235, style: 'terrace', floors: 3 },
          { x: 1025, w: 190, h: 260, style: 'tenement', floors: 4 }
        ],
        markers: [
          { id: 'ada', x: 246, streetY: 432, roofY: 221, type: 'npc', action: 'dialogue', label: 'Ada Mercer', speaker: 'Ada Mercer', role: 'SENDİKA KURUCUSU', symbol: '◉' },
          { id: 'wh-letter', x: 475, streetY: 426, roofY: 245, type: 'collectible', action: 'letter', itemType: 'letter', label: 'Gizli mektup', symbol: '✉' },
          { id: 'wh-captain', x: 850, streetY: 432, roofY: 170, type: 'boss', action: 'boss', label: 'Kaptan Rook', speaker: 'Kaptan Rook', role: 'IRON COGS · WHITECHAPEL', symbol: '⚔' },
          { id: 'wh-market', x: 1080, streetY: 423, roofY: 202, type: 'landmark', label: 'Whitechapel Market', description: 'Dar geçitleri ve kalabalık pazar tezgâhları, gizlice kaybolmak için idealdir.', symbol: '⌂' },
          { id: 'wh-relic', x: 130, streetY: 434, roofY: 290, type: 'collectible', itemType: 'relic', label: 'İşçi rozeti', symbol: '✦' },
          { id: 'wh-chest', x: 700, streetY: 434, roofY: 188, type: 'collectible', itemType: 'chest', label: 'Çete sandığı', symbol: '▣' }
        ]
      },
      westminster: {
        id: 'westminster', index: '02', name: 'Westminster', subtitle: 'Taş saraylar · parlamento · Big Ben',
        boss: 'Lord Ironford', atmosphere: 'Devlet gücü ve zenginliğin kalbi', baseline: 464,
        sky: ['#4a4d4b', '#262a27', '#151815'], ambience: 'fog',
        description: 'Westminster’ın devasa taş yapıları, Ironford’un siyasi nüfuzunu gölgeleriyle bile hissettiriyor.',
        landmarkSummary: 'Big Ben · Westminster Sarayı · Thames kıyısı',
        grid: {
          street: makeGrid(['......L.......','..BBBBBB..BBBB','..BBBBBB..BBBB','RRRRRRRRRRRRRR','..G....C...L..','BBBB..BBBB..BB','BBBB..BBBB..BB','RRRRRRRRRRRRRR']),
          rooftop: makeGrid(['......A.......','..BBBBBB..BBBB','..BBBBLB..BBBB','..A....A...A..','..BBBBBB..BBBB','..A....A...A..','..BBBBBB..BBBB','..............'])
        },
        buildings: [
          { x: 0, w: 185, h: 260, style: 'stone-palace', floors: 4 },
          { x: 180, w: 200, h: 300, style: 'stone-palace', floors: 4 },
          { x: 375, w: 185, h: 242, style: 'stone-palace', floors: 3 },
          { x: 555, w: 165, h: 280, style: 'stone-palace', floors: 4 },
          { x: 735, w: 125, h: 410, style: 'clocktower', floors: 5 },
          { x: 860, w: 170, h: 285, style: 'stone-palace', floors: 4 },
          { x: 1027, w: 190, h: 245, style: 'stone-palace', floors: 3 }
        ],
        markers: [
          { id: 'big-ben-climb', x: 790, streetY: 423, roofY: 72, type: 'landmark', action: 'climb', label: 'Big Ben tepesine çık', symbol: '⌂' },
          { id: 'ironford', x: 1015, streetY: 430, roofY: 210, type: 'boss', action: 'ironford', label: 'Lord Ironford', speaker: 'Lord Ironford', role: 'SANAYİCİ TİRAN', symbol: '⚔' },
          { id: 'minster-landmark', x: 490, streetY: 430, roofY: 215, type: 'landmark', label: 'Westminster Sarayı', description: 'Demir parmaklıkların arkasında kararlar alınır; sokaklarda sonuçlarına işçiler katlanır.', symbol: '⌂' },
          { id: 'minster-letter', x: 300, streetY: 430, roofY: 192, type: 'collectible', itemType: 'letter', label: 'Parlamento mektubu', symbol: '✉' },
          { id: 'minster-relic', x: 605, streetY: 430, roofY: 205, type: 'collectible', itemType: 'relic', label: 'Kraliyet madalyonu', symbol: '✦' },
          { id: 'minster-chest', x: 1120, streetY: 430, roofY: 220, type: 'collectible', itemType: 'chest', label: 'Gizli kasa', symbol: '▣' }
        ]
      },
      docks: {
        id: 'docks', index: '03', name: 'Thames Docks', subtitle: 'Nehir sisleri · yük vinçleri · silah depoları',
        boss: 'Dockmaster Huxley', atmosphere: 'Kaçak yükler ve demir vinçler', baseline: 438,
        sky: ['#3c4d50', '#202c2d', '#131a1b'], ambience: 'water',
        description: 'Thames kıyısındaki depolar, Iron Cogs’a silah ve para taşıyor. Sis, hem örtü hem tuzak.',
        landmarkSummary: 'Thames rıhtımları · Vinçler · Kaçak yük depoları',
        grid: {
          street: makeGrid(['..............','..BBBB...BBBB.','..BBBB...BBBB.','RRRRRRRRRRRRRR','..C..G..W.WW..','BBBBBBBBWWWWWW','BBBBBBBBWWWWWW','RRRRRRRRWWWWWW']),
          rooftop: makeGrid(['..A....A...A..','..BBBB...BBBB.','..BBBB...BBBB.','..A....A...A..','..BBBB...BBBB.','..A....A...AWW','..BBBB...BBBBW','..............'])
        },
        buildings: [
          { x: 0, w: 200, h: 215, style: 'warehouse', floors: 3 },
          { x: 195, w: 195, h: 250, style: 'warehouse', floors: 3 },
          { x: 390, w: 180, h: 210, style: 'warehouse', floors: 3 },
          { x: 590, w: 220, h: 270, style: 'warehouse', floors: 4 },
          { x: 810, w: 165, h: 230, style: 'warehouse', floors: 3 },
          { x: 985, w: 230, h: 205, style: 'warehouse', floors: 3 }
        ],
        cranes: [{ x: 430, y: 190, height: 190 }, { x: 945, y: 165, height: 215 }],
        markers: [
          { id: 'dock-sabotage', x: 450, streetY: 414, roofY: 230, type: 'mission', action: 'sabotage', label: 'Silah kasalarını sabote et', symbol: '⚙' },
          { id: 'dock-manifest', x: 735, streetY: 414, roofY: 194, type: 'collectible', action: 'manifest', itemType: 'letter', label: 'Kaçak yük manifestosu', symbol: '✉' },
          { id: 'dockmaster', x: 1010, streetY: 412, roofY: 212, type: 'boss', action: 'dockBoss', label: 'Dockmaster Huxley', speaker: 'Dockmaster Huxley', role: 'IRON COGS · THAMES', symbol: '⚔' },
          { id: 'dock-landmark', x: 170, streetY: 414, roofY: 218, type: 'landmark', label: 'Eski rıhtım', description: 'Gemiler gece yarısı yanaşır. Kayıt dışı yükler, fabrikalara buradan taşınır.', symbol: '⌂' },
          { id: 'dock-relic', x: 275, streetY: 414, roofY: 190, type: 'collectible', itemType: 'relic', label: 'Denizci pusulası', symbol: '✦' },
          { id: 'dock-chest', x: 845, streetY: 414, roofY: 205, type: 'collectible', itemType: 'chest', label: 'Kaçak sandık', symbol: '▣' }
        ]
      },
      industrial: {
        id: 'industrial', index: '04', name: 'Industrial City', subtitle: 'Dökümhaneler · dev bacalar · Ironford’un fabrikası',
        boss: 'Foreman Briggs', atmosphere: 'Kömür dumanı ve makine gürültüsü', baseline: 463,
        sky: ['#464541', '#242521', '#121411'], ambience: 'smoke',
        description: 'Ironford’un fabrikaları şehri besliyor gibi görünür; gerçekte şehrin emeğini ve geleceğini öğütür.',
        landmarkSummary: 'Ironford Fabrikası · Dökümhane · Buhar bacaları',
        grid: {
          street: makeGrid(['..A......A....','..BBBBBBBBBB..','..BBBBBBBBBB..','RRRRRRRRRRRRRR','..G...C....L..','BBBBBBBBBBBBBB','BBBBBBBBBBBBBB','RRRRRRRRRRRRRR']),
          rooftop: makeGrid(['..A......A....','..BBBBBBBBBB..','..BLLBBBBBBB..','..A......A....','..BBBBBBBBBB..','..A......A....','..BBBBBBBBBB..','..............'])
        },
        buildings: [
          { x: 0, w: 205, h: 260, style: 'factory', floors: 4 },
          { x: 200, w: 210, h: 315, style: 'factory', floors: 5 },
          { x: 405, w: 165, h: 240, style: 'factory', floors: 3 },
          { x: 565, w: 245, h: 338, style: 'factory', floors: 5 },
          { x: 805, w: 165, h: 260, style: 'factory', floors: 4 },
          { x: 965, w: 245, h: 300, style: 'factory', floors: 4 }
        ],
        chimneys: [{ x: 85, height: 145 }, { x: 285, height: 190 }, { x: 650, height: 220 }, { x: 1040, height: 170 }],
        markers: [
          { id: 'factory-gate', x: 650, streetY: 433, roofY: 100, type: 'mission', action: 'factory', label: 'Ironford fabrikasına gir', symbol: '⚙' },
          { id: 'factory-ledger', x: 845, streetY: 433, roofY: 220, type: 'collectible', action: 'ledger', itemType: 'letter', label: 'Üretim defteri', symbol: '✉' },
          { id: 'foreman', x: 1070, streetY: 433, roofY: 175, type: 'boss', action: 'foremanBoss', label: 'Foreman Briggs', speaker: 'Foreman Briggs', role: 'FABRİKA GÜVENLİK ŞEFİ', symbol: '⚔' },
          { id: 'factory-landmark', x: 255, streetY: 433, roofY: 145, type: 'landmark', label: 'Dökümhane', description: 'Fırınların kızıl ışığı geceyi deler. Fabrikanın arka çatısında servis geçitleri bulunur.', symbol: '⌂' },
          { id: 'factory-relic', x: 145, streetY: 433, roofY: 196, type: 'collectible', itemType: 'relic', label: 'Eski işçi madalyası', symbol: '✦' },
          { id: 'factory-chest', x: 475, streetY: 433, roofY: 230, type: 'collectible', itemType: 'chest', label: 'Ücret sandığı', symbol: '▣' }
        ]
      }
    }
  };

  // Dialogues live with quest data. The UI doesn't need to know what an Act means.
  const QUESTS = [
    {
      id: 'act1-whitechapel', act: 'ACT I', actTitle: 'THE SPARK', title: 'Birliğin Kıvılcımı', district: 'whitechapel',
      description: 'Ada Mercer ile buluş, işçilerin sesini birleştir ve Whitechapel sokaklarını Iron Cogs’tan geri al.',
      objectives: [
        { id: 'meet-ada', title: 'Ada Mercer ile buluş', description: 'Şapelin yakınındaki konuşma işaretine git.', action: 'dialogue', markerId: 'ada', district: 'whitechapel', liberationGain: 15,
          dialogue: [
            { speaker: 'Ada Mercer', role: 'SENDİKA KURUCUSU', text: 'Whitechapel her gece biraz daha kararıyor. Iron Cogs işçilerin ücretlerini alıyor, çocukları fabrikalara sürüyor.' },
            { speaker: 'active', role: 'YERALTI SENDİKASI', text: 'Tek başımıza değil. Sokakları bilenleri, çatıları kullananları ve sesini kaybetmeyenleri bir araya getireceğiz.' },
            { speaker: 'Ada Mercer', role: 'SENDİKA KURUCUSU', text: 'O hâlde şu mektubu bul. İçinde Rook’un pazar karargâhına dair kanıt var.' }
          ]
        },
        { id: 'find-wh-letter', title: 'Gizli mektubu ele geçir', description: 'Altın mektup işaretine tıkla.', action: 'letter', markerId: 'wh-letter', district: 'whitechapel', liberationGain: 25 },
        { id: 'defeat-rook', title: 'Kaptan Rook’u alt et', description: 'Kırmızı kılıç işaretindeki boss karşılaşmasını tamamla.', action: 'boss', markerId: 'wh-captain', district: 'whitechapel', liberationGain: 60,
          dialogue: [
            { speaker: 'Kaptan Rook', role: 'IRON COGS', text: 'Bu sokakların sahibi Ironford. Senin gibi hayalperestler burada uzun yaşamaz.' },
            { speaker: 'active', role: 'YERALTI SENDİKASI', text: 'Bu sokaklar kimsenin mülkü değil. İnsanların evi.' },
            { speaker: 'Ada Mercer', role: 'SENDİKA KURUCUSU', text: 'Rook düştü. Whitechapel nefes alıyor. Ama silahların çoğu Thames üzerinden geliyor.' }
          ]
        }
      ]
    },
    {
      id: 'act2-docks', act: 'ACT II', actTitle: 'THE BLACK TIDE', title: 'Thames’te Sessiz Sabotaj', district: 'docks',
      description: 'Silah sevkiyatını durdur, kaçak yüklerin kayıtlarını ele geçir ve rıhtımı Iron Cogs’un elinden kurtar.',
      objectives: [
        { id: 'sabotage-crates', title: 'Silah kasalarını sabote et', description: 'Rıhtımdaki dişli işaretine tıkla.', action: 'sabotage', markerId: 'dock-sabotage', district: 'docks', liberationGain: 20,
          dialogue: [
            { speaker: 'Ada Mercer', role: 'SENDİKA KURUCUSU', text: 'Bu kasalar yarın sabah Whitechapel’a gidecek. İçindekiler yalnızca silah değil, şehri korkuyla yönetme planı.' },
            { speaker: 'active', role: 'YERALTI SENDİKASI', text: 'Sevkiyat durursa Ironford’un adamları birbirine düşer. Sessiz çalışalım.' }
          ]
        },
        { id: 'take-manifest', title: 'Kaçak yük manifestosunu bul', description: 'Mektup işaretindeki sevkiyat kaydını topla.', action: 'manifest', markerId: 'dock-manifest', district: 'docks', liberationGain: 25 },
        { id: 'defeat-dockmaster', title: 'Dockmaster Huxley’i yen', description: 'Kızıl kılıç işaretindeki karşılaşmayı tamamla.', action: 'dockBoss', markerId: 'dockmaster', district: 'docks', liberationGain: 55,
          dialogue: [
            { speaker: 'Dockmaster Huxley', role: 'IRON COGS · THAMES', text: 'Nehir kimin mal taşıdığını sormaz. Para ödendi mi, gemi yol alır.' },
            { speaker: 'active', role: 'YERALTI SENDİKASI', text: 'Bu gece nehir, senin sırlarını taşıyacak.' },
            { speaker: 'Ada Mercer', role: 'SENDİKA KURUCUSU', text: 'Manifesto Ironford’un fabrikasını gösteriyor. Orada çalışanların ifadeleri de var.' }
          ]
        }
      ]
    },
    {
      id: 'act3-factory', act: 'ACT III', actTitle: 'IRON & ASH', title: 'Ironford’un Fabrikasına Baskın', district: 'industrial',
      description: 'Üretim hattına sız, işçilerin kayıtlarını ortaya çıkar ve fabrikayı koruyan ustabaşını etkisiz hâle getir.',
      objectives: [
        { id: 'enter-factory', title: 'Fabrikaya sız', description: 'Fabrika girişindeki dişli işaretine tıkla.', action: 'factory', markerId: 'factory-gate', district: 'industrial', liberationGain: 25,
          dialogue: [
            { speaker: 'Ada Mercer', role: 'SENDİKA KURUCUSU', text: 'Fabrikanın bacaları Londra’ya duman, kasaları Ironford’a servet taşıyor. İşçilerin gerçek kayıtları içeride saklı.' },
            { speaker: 'active', role: 'YERALTI SENDİKASI', text: 'Çatıdan içeri gireceğim. Kayıtları bulduğumuzda bu şehrin görmezden geldiği gerçekleri herkes görecek.' }
          ]
        },
        { id: 'find-ledger', title: 'Üretim defterini ele geçir', description: 'Mektup simgeli defteri topla.', action: 'ledger', markerId: 'factory-ledger', district: 'industrial', liberationGain: 25 },
        { id: 'defeat-foreman', title: 'Ustabaşı Briggs’i yen', description: 'Kırmızı kılıç işaretindeki karşılaşmayı tamamla.', action: 'foremanBoss', markerId: 'foreman', district: 'industrial', liberationGain: 50,
          dialogue: [
            { speaker: 'Foreman Briggs', role: 'IRONFORD FABRİKASI', text: 'Bu makineler durursa binlerce insan işsiz kalır. Demek istediğin özgürlük bu mu?' },
            { speaker: 'active', role: 'YERALTI SENDİKASI', text: 'İnsanları makinelerden önce koymayı öğrenebiliriz. Korkuyu maaş diye dağıtmak zorunda değiliz.' },
            { speaker: 'Ada Mercer', role: 'SENDİKA KURUCUSU', text: 'Defter elimizde. Ironford kaçamayacak. Onunla Big Ben’in tepesinde yüzleşeceğiz.' }
          ]
        }
      ]
    },
    {
      id: 'act3-bigben', act: 'ACT III', actTitle: 'IRON & ASH', title: 'Big Ben: Son Çağrı', district: 'westminster',
      description: 'Westminster’ın üstüne tırman ve Lord Ironford’un şehir üzerindeki hükmüne son ver.',
      objectives: [
        { id: 'climb-bigben', title: 'Big Ben’in tepesine ulaş', description: 'Saat kulesindeki altın simgeye tıkla.', action: 'climb', markerId: 'big-ben-climb', district: 'westminster', liberationGain: 20,
          dialogue: [
            { speaker: 'active', role: 'YERALTI SENDİKASI', text: 'Bütün Londra aşağıda. Fabrikaların dumanı, nehrin sisi, sokakların ışıkları… Bu şehir yeniden nefes alabilir.' },
            { speaker: 'Lord Ironford', role: 'SANAYİCİ TİRAN', text: 'Şehri ben ayakta tuttum. İşçiler, makineler, limanlar… Her şey benim düzenim sayesinde var.' }
          ]
        },
        { id: 'defeat-ironford', title: 'Lord Ironford’u alt et', description: 'Big Ben’deki son boss işaretini seç.', action: 'ironford', markerId: 'ironford', district: 'westminster', liberationGain: 80,
          dialogue: [
            { speaker: 'Lord Ironford', role: 'SANAYİCİ TİRAN', text: 'Beni yenersen hiçbir şey değişmez. Şehir düzen ister, düzen de bir bedel.' },
            { speaker: 'active', role: 'YERALTI SENDİKASI', text: 'Düzen, insanların zincirleri değil. Bu şehrin geleceğine artık tek bir adam karar vermeyecek.' },
            { speaker: 'Ada Mercer', role: 'SENDİKA KURUCUSU', text: 'Saat çaldı, Ironford. Londra artık kendi sesini duyacak.' }
          ]
        }
      ]
    }
  ];

  // ---------------------------------------------------------------------------
  // 2B. EXPANDED WORLD DATA: four long sectors per district, real layer-specific
  // targets and human street/roof population. The story markers stay in sector 1.
  // ---------------------------------------------------------------------------
  const WORLD_SEGMENT_WIDTH = 1260;
  const WORLD_SEGMENT_COUNT = 4;
  WORLD_DATA.gridSize = { columns: 14, rows: 8, sectors: WORLD_SEGMENT_COUNT };

  const QUEST_MARKER_IDS = new Set(QUESTS.flatMap(quest => quest.objectives.map(objective => objective.markerId)));
  const ROOFTOP_MARKER_IDS = new Set([
    'wh-letter', 'wh-relic', 'wh-chest', 'big-ben-climb', 'minster-letter', 'minster-relic',
    'dock-manifest', 'dock-relic', 'dock-chest', 'factory-gate', 'factory-relic'
  ]);
  const STREET_MARKER_IDS = new Set([
    'ada', 'wh-captain', 'wh-market', 'minster-landmark', 'minster-chest', 'ironford',
    'dock-sabotage', 'dockmaster', 'dock-landmark', 'factory-ledger', 'foreman',
    'factory-landmark', 'factory-chest'
  ]);

  function expandDistrictForFreeRoam(district) {
    const seedBuildings = district.buildings.map(building => ({ ...building }));
    const seedMarkers = district.markers.map(marker => ({ ...marker }));
    const seedCranes = (district.cranes || []).map(item => ({ ...item }));
    const seedChimneys = (district.chimneys || []).map(item => ({ ...item }));
    district.worldWidth = WORLD_SEGMENT_WIDTH * WORLD_SEGMENT_COUNT;

    district.buildings = [];
    district.cranes = [];
    district.chimneys = [];
    district.people = [];
    for (let sector = 0; sector < WORLD_SEGMENT_COUNT; sector++) {
      seedBuildings.forEach((building, index) => {
        const copy = { ...building, x: building.x + sector * WORLD_SEGMENT_WIDTH };
        if (sector > 0) {
          // Preserve the district's visual language while avoiding a stamped-copy look.
          const heightShift = ((index * 23 + sector * 31) % 65) - 28;
          copy.h = clamp(building.h + heightShift, 145, 390);
          if (copy.style === 'clocktower') copy.style = 'stone-palace';
          if (copy.style === 'chapel') copy.style = 'terrace';
          if (sector % 2 === 0 && copy.style === 'terrace') copy.style = 'tenement';
          if (sector % 3 === 0 && copy.style === 'warehouse') copy.style = 'pub';
        }
        district.buildings.push(copy);
      });
      seedCranes.forEach(crane => district.cranes.push({ ...crane, x: crane.x + sector * WORLD_SEGMENT_WIDTH }));
      seedChimneys.forEach(chimney => district.chimneys.push({ ...chimney, x: chimney.x + sector * WORLD_SEGMENT_WIDTH }));
    }

    // Assign each story/collectible marker to one physical layer and align roof goals
    // with the actual collision platform rather than letting them float in space.
    district.markers = seedMarkers.map(marker => {
      const copy = { ...marker };
      copy.layer = ROOFTOP_MARKER_IDS.has(copy.id)
        ? 'rooftop'
        : STREET_MARKER_IDS.has(copy.id) ? 'street'
        : (copy.type === 'boss' || copy.type === 'npc' ? 'street' : 'rooftop');
      if (copy.layer === 'street') copy.streetY = district.baseline;
      if (copy.layer === 'rooftop') {
        let building = seedBuildings.find(item => copy.x >= item.x + 5 && copy.x <= item.x + item.w - 5);
        if (!building) {
          building = seedBuildings.reduce((best, item) => {
            const distance = Math.abs((item.x + item.w / 2) - copy.x);
            return !best || distance < best.distance ? { item, distance } : best;
          }, null).item;
          copy.x = clamp(copy.x, building.x + 22, building.x + building.w - 22);
        }
        copy.roofY = district.baseline - building.h - 7;
      }
      return copy;
    });

    // Populate all sectors with people. Human actors are drawn as full figures,
    // not floating dots/icons. Guards use rooftops; civilians and patrols use streets.
    const streetOffsets = [82, 352, 586, 922, 1138];
    const roofOffsets = [282, 716, 1038];
    for (let sector = 0; sector < WORLD_SEGMENT_COUNT; sector++) {
      streetOffsets.forEach((offset, index) => {
        const x = sector * WORLD_SEGMENT_WIDTH + offset;
        district.people.push({
          id: `${district.id}-street-person-${sector}-${index}`, x,
          layer: 'street', kind: index % 3 === 0 ? 'guard' : 'civilian',
          name: index % 3 === 0 ? 'Iron Cogs Devriyesi' : 'Londralı',
          phase: (sector * 2.7 + index * 1.9), speed: 14 + (index % 3) * 7,
          patrol: 36 + (index % 3) * 16, facing: index % 2 ? -1 : 1
        });
      });
      roofOffsets.forEach((offset, index) => {
        let x = sector * WORLD_SEGMENT_WIDTH + offset;
        let building = district.buildings.find(item => x >= item.x + 15 && x <= item.x + item.w - 15);
        if (!building) building = district.buildings.reduce((best, item) => Math.abs(item.x + item.w / 2 - x) < Math.abs(best.x + best.w / 2 - x) ? item : best);
        x = clamp(x, building.x + 20, building.x + building.w - 20);
        district.people.push({
          id: `${district.id}-roof-guard-${sector}-${index}`, x,
          layer: 'rooftop', kind: 'guard', name: 'Çatı Nöbetçisi',
          phase: sector * 1.8 + index * 2.4, speed: 10 + index * 3,
          patrol: 22 + index * 9, facing: index % 2 ? -1 : 1,
          roofY: district.baseline - building.h - 7
        });
      });
    }

    // Additional non-story discoveries populate the extended sectors. Main quest
    // targets are not duplicated, so they can only be completed in their intended place.
    district.markers.slice().filter(marker => !QUEST_MARKER_IDS.has(marker.id) && marker.type !== 'boss' && marker.type !== 'mission' && marker.type !== 'npc')
      .forEach(marker => {
        for (let sector = 1; sector < WORLD_SEGMENT_COUNT; sector++) {
          const copy = { ...marker, id: `${marker.id}-sector-${sector + 1}`, x: marker.x + sector * WORLD_SEGMENT_WIDTH };
          if (copy.layer === 'street') copy.streetY = district.baseline;
          if (copy.layer === 'rooftop') {
            const building = district.buildings.find(item => copy.x >= item.x + 5 && copy.x <= item.x + item.w - 5);
            if (building) copy.roofY = district.baseline - building.h - 7;
          }
          if (copy.type === 'landmark') copy.label = `${marker.label} · Sektör ${sector + 1}`;
          district.markers.push(copy);
        }
      });
  }
  Object.values(WORLD_DATA.districts).forEach(expandDistrictForFreeRoam);

  const ALL_MARKERS = Object.values(WORLD_DATA.districts).flatMap(district => district.markers);
  const COLLECTIBLE_MARKERS = ALL_MARKERS.filter(marker => marker.type === 'collectible');

  // ---------------------------------------------------------------------------
  // 3. CHARACTER MANAGER: a single active-character source of truth.
  // ---------------------------------------------------------------------------
  class CharacterManager {
    constructor(characterData, eventBus) {
      this.characters = characterData;
      this.activeId = 'arthur';
      this.events = eventBus;
    }
    get active() { return this.characters[this.activeId]; }
    get(id) { return this.characters[id] ?? null; }
    switchTo(id) {
      if (!this.characters[id] || id === this.activeId) return false;
      const previous = this.activeId;
      this.activeId = id;
      this.events.emit('character:changed', { previous, current: id, character: this.active });
      return true;
    }
    toggle() { return this.switchTo(this.activeId === 'arthur' ? 'eleanor' : 'arthur'); }
  }

  // ---------------------------------------------------------------------------
  // 4. WORLD MAP: district selection, street/rooftop layer and control state.
  // ---------------------------------------------------------------------------
  class WorldMap {
    constructor(data, eventBus) {
      this.data = data;
      this.events = eventBus;
      this.activeDistrictId = 'whitechapel';
      this.activeLayer = 'street';
      this.liberation = Object.fromEntries(Object.keys(data.districts).map(id => [id, 0]));
      this.collected = new Set();
    }
    get activeDistrict() { return this.data.districts[this.activeDistrictId]; }
    getDistrict(id) { return this.data.districts[id] ?? null; }
    selectDistrict(id) {
      if (!this.data.districts[id] || id === this.activeDistrictId) return;
      const previous = this.activeDistrictId;
      this.activeDistrictId = id;
      this.activeLayer = 'street';
      this.events.emit('world:districtchange', { previous, current: id, district: this.activeDistrict });
      this.events.emit('world:layerchange', { previous: 'rooftop', current: 'street' });
    }
    setLayer(layer) {
      if (!['street', 'rooftop'].includes(layer) || layer === this.activeLayer) return;
      const previous = this.activeLayer;
      this.activeLayer = layer;
      this.events.emit('world:layerchange', { previous, current: layer });
    }
    addLiberation(id, amount) {
      if (!Object.hasOwn(this.liberation, id)) return;
      const previous = this.liberation[id];
      this.liberation[id] = clamp(previous + amount, 0, 100);
      this.events.emit('district:progress', { id, previous, current: this.liberation[id], liberated: this.liberation[id] >= 100 });
    }
    collect(marker) {
      if (!marker || marker.type !== 'collectible' || this.collected.has(marker.id)) return false;
      this.collected.add(marker.id);
      this.events.emit('world:collectible', { marker, counts: this.getInventoryCounts() });
      return true;
    }
    isCollected(markerId) { return this.collected.has(markerId); }
    getInventoryCounts() {
      const counts = { letter: 0, relic: 0, chest: 0, total: this.collected.size, max: COLLECTIBLE_MARKERS.length };
      for (const marker of COLLECTIBLE_MARKERS) {
        if (this.collected.has(marker.id)) {
          const category = marker.itemType || 'relic';
          counts[category] = (counts[category] ?? 0) + 1;
        }
      }
      return counts;
    }
    getCityFreedom() {
      const values = Object.values(this.liberation);
      return values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
    }
    getGrid() { return this.activeDistrict.grid[this.activeLayer]; }
  }

  // ---------------------------------------------------------------------------
  // 5. QUEST ENGINE: validates target actions and updates region control.
  // ---------------------------------------------------------------------------
  class QuestEngine {
    constructor(quests, worldMap, eventBus) {
      this.quests = quests;
      this.world = worldMap;
      this.events = eventBus;
      this.questIndex = 0;
      this.objectiveIndex = 0;
      this.completedObjectives = new Set();
      this.completedQuests = new Set();
      this.isComplete = false;
    }
    get currentQuest() { return this.quests[this.questIndex] ?? null; }
    get currentObjective() { return this.currentQuest?.objectives[this.objectiveIndex] ?? null; }
    get overallProgress() {
      const total = this.quests.reduce((sum, quest) => sum + quest.objectives.length, 0);
      return total ? this.completedObjectives.size / total * 100 : 100;
    }
    isObjectiveDone(objectiveId) { return this.completedObjectives.has(objectiveId); }
    completeObjective(action) {
      const quest = this.currentQuest;
      const objective = this.currentObjective;
      if (!quest || !objective || objective.action !== action) return false;
      if (this.completedObjectives.has(objective.id)) return false;

      this.completedObjectives.add(objective.id);
      this.world.addLiberation(objective.district, objective.liberationGain || 0);
      this.events.emit('quest:objectivecompleted', { quest, objective, progress: this.overallProgress });
      this.objectiveIndex += 1;

      if (this.objectiveIndex >= quest.objectives.length) {
        this.completedQuests.add(quest.id);
        this.events.emit('quest:completed', { quest });
        this.questIndex += 1;
        this.objectiveIndex = 0;
      }

      const nextObjective = this.currentObjective;
      if (nextObjective) {
        // Keep the player where they are when the next objective is in this district.
        // District travel only happens when the narrative genuinely changes region.
        if (nextObjective.district !== this.world.activeDistrictId) this.world.selectDistrict(nextObjective.district);
      } else this.isComplete = true;
      this.events.emit('quest:changed', {
        quest: this.currentQuest,
        objective: this.currentObjective,
        progress: this.overallProgress,
        isComplete: this.isComplete
      });
      return true;
    }
  }

  // ---------------------------------------------------------------------------
  // 6. PARALLAX RENDERER: procedural Victorian architecture, fog, lamps and smoke.
  // ---------------------------------------------------------------------------
  class ParallaxRenderer {
    constructor(canvas, worldMap, characterManager, eventBus) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.world = worldMap;
      this.characters = characterManager;
      this.events = eventBus;
      this.width = canvas.width;
      this.height = canvas.height;
      this.elapsed = 0;
      this.markerHits = [];
      this.onMarkerClick = null;
      this.lastFrame = 0;
      this.running = false;

      // Playable avatar state. World positions use the canvas's 1200×570 coordinate space.
      this.player = {
        x: 100,
        footY: worldMap.activeDistrict.baseline,
        shadowY: worldMap.activeDistrict.baseline,
        vx: 0,
        vy: 0,
        facing: 1,
        onGround: true,
        walkPhase: 0
      };
      this.keys = new Set();
      this.touchInput = { left: false, right: false };
      this.jumpQueued = false;
      this.nearbyMarker = null;

      canvas.addEventListener('click', event => this.handleCanvasClick(event));
      canvas.addEventListener('pointermove', event => {
        const rect = canvas.getBoundingClientRect();
        this.pointer.x = (event.clientX - rect.left) * this.width / rect.width;
        this.pointer.y = (event.clientY - rect.top) * this.height / rect.height;
        this.pointer.inside = true;
      });
      canvas.addEventListener('pointerleave', () => { this.pointer.inside = false; });
      canvas.addEventListener('contextmenu', event => {
        event.preventDefault();
        const rect = canvas.getBoundingClientRect();
        this.pointer.x = (event.clientX - rect.left) * this.width / rect.width;
        this.pointer.y = (event.clientY - rect.top) * this.height / rect.height;
        this.pointer.inside = true;
        this.launchHook(true);
      });
      window.addEventListener('keydown', event => this.handleMovementKeyDown(event));
      window.addEventListener('keyup', event => this.handleMovementKeyUp(event));
      window.addEventListener('blur', () => {
        this.keys.clear();
        this.touchInput.left = false;
        this.touchInput.right = false;
        this.pullHeld = false;
      });
      this.cameraX = 0;
      this.cameraY = 0;
      this.pointer = { x: this.width * 0.72, y: this.height * 0.34, inside: false };
      this.hook = { state: 'idle', anchor: null, target: null, timer: 0, ropeLength: 0, cooldown: 0 };
      this.pullHeld = false;
      this.animState = 'Idle';
      this.landPulse = 0;
      this.events.on('world:districtchange', () => { this.resetPlayerPosition(true); this.cameraX = 0; this.renderImmediate(); });
      // Layer changes now happen only on a physical landing/fall, never by teleporting.
      this.events.on('world:layerchange', () => this.renderImmediate());
      this.events.on('character:changed', () => this.renderImmediate());
      this.events.on('world:collectible', () => this.renderImmediate());
    }
    start() {
      if (this.running) return;
      this.running = true;
      requestAnimationFrame(time => this.loop(time));
    }
    loop(time) {
      if (!this.running) return;
      const delta = this.lastFrame ? Math.min((time - this.lastFrame) / 1000, .05) : 0;
      this.lastFrame = time;
      if (this.combat && this.combat.hitStop > 0) { this.combat.hitStop = Math.max(0, this.combat.hitStop - delta); }
      else { this.elapsed += delta; this.updatePlayer(delta); if (this.combat) this.combat.update(delta); }
      this.draw();
      requestAnimationFrame(next => this.loop(next));
    }
    renderImmediate() { this.draw(); }

    handleMovementKeyDown(event) {
      const target = event.target;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

      if (event.code === 'KeyG' && !event.repeat) {
        this.launchHook(false);
        event.preventDefault();
        return;
      }
      if (event.code === 'KeyX' && !event.repeat) {
        this.releaseHook();
        event.preventDefault();
        return;
      }
      if (event.code === 'KeyF') {
        this.pullHeld = true;
        this.keys.add(event.code);
        event.preventDefault();
        return;
      }

      const movementKeys = new Set(['KeyA', 'KeyD', 'ArrowLeft', 'ArrowRight', 'Space', 'ArrowUp', 'KeyW', 'ShiftLeft', 'ShiftRight']);
      if (!movementKeys.has(event.code)) return;
      if (event.code === 'Space' || event.code === 'ArrowUp' || event.code === 'KeyW') {
        if (!event.repeat) this.jumpQueued = true;
      }
      this.keys.add(event.code);
      event.preventDefault();
    }

    handleMovementKeyUp(event) {
      this.keys.delete(event.code);
      if (event.code === 'KeyF') this.pullHeld = false;
    }

    setTouchInput(action, pressed) {
      if (action === 'left' || action === 'right') {
        this.touchInput[action] = pressed;
      } else if (action === 'jump' && pressed) {
        this.jumpQueued = true;
      } else if (action === 'interact' && pressed) {
        if (!this.combat?.tryStealth()) this.interactNearest();
      } else if (action === 'hook' && pressed) {
        this.launchHook(false);
      } else if (action === 'pull') {
        this.pullHeld = pressed;
      } else if (action === 'release' && pressed) {
        this.releaseHook();
      }
    }

    getHookAnchors() {
      const anchors = [];
      for (const platform of this.getRoofPlatforms()) {
        const xs = [platform.left + 22, (platform.left + platform.right) * 0.5, platform.right - 22];
        xs.forEach((x, index) => anchors.push({
          x, y: platform.y - 8, surfaceY: platform.y,
          platform, id: `${platform.building.x}-${index}`
        }));
      }
      return anchors;
    }

    launchHook(usePointer = false) {
      if (this.hook.state !== 'idle') {
        if (this.hook.state === 'attached') this.releaseHook();
        return false;
      }
      if (this.hook.cooldown > 0) {
        showToast(`Kanca yeniden hazırlanıyor: ${this.hook.cooldown.toFixed(1)} sn.`);
        return false;
      }

      const player = this.player;
      const handY = player.footY - 30;
      const maxRange = this.characters.active.hookRange || 480;
      const platforms = this.getRoofPlatforms();
      const currentPlatform = this.world.activeLayer === 'rooftop'
        ? platforms.find(platform => player.x >= platform.left && player.x <= platform.right && Math.abs(platform.y - player.footY) < 12)
        : null;
      const anchors = this.getHookAnchors().filter(anchor => {
        const distance = Math.hypot(anchor.x - player.x, anchor.y - handY);
        const canReachFromStreet = anchor.y < player.footY - 25;
        const canReachFromRoof = anchor.platform.building !== currentPlatform?.building && anchor.y < player.footY + 60;
        const layerReachable = this.world.activeLayer === 'rooftop' ? canReachFromRoof : canReachFromStreet;
        return distance >= 55 && distance <= maxRange && layerReachable;
      });
      if (!anchors.length) {
        showToast('Kanca menzilinde uygun bir çatı kenarı yok. Biraz yaklaş veya Eleanor’u dene.');
        return false;
      }

      let target = null;
      if (usePointer || this.pointer.inside) {
        const aimX = this.cameraX + this.pointer.x;
        const aimY = this.pointer.y + this.cameraY;
        const ordered = anchors.map(anchor => ({ anchor, aim: Math.hypot(anchor.x - aimX, anchor.y - aimY) }))
          .sort((a, b) => a.aim - b.aim);
        if (ordered[0] && ordered[0].aim < 175) target = ordered[0].anchor;
      }
      if (!target) {
        const facing = player.facing || 1;
        const forward = anchors.filter(anchor => (anchor.x - player.x) * facing > -35);
        const pool = forward.length ? forward : anchors;
        target = pool.sort((a, b) => {
          const score = anchor => Math.hypot(anchor.x - player.x, anchor.y - handY) + Math.max(0, -(anchor.x - player.x) * facing) * 1.8;
          return score(a) - score(b);
        })[0];
      }
      if (!target) return false;

      this.hook = {
        state: 'launching', anchor: null, target,
        fromX: player.x, fromY: handY, timer: 0, ropeLength: 0,
        cooldown: this.hook.cooldown || 0
      };
      this.animState = 'HookLaunch';
      showToast('Kanca fırlatıldı! Halatı germek ve yükselmek için F tuşunu basılı tut.');
      return true;
    }

    releaseHook() {
      if (this.hook.state === 'idle') return;
      this.hook = { state: 'idle', anchor: null, target: null, timer: 0, ropeLength: 0, cooldown: 0.45 };
      this.pullHeld = false;
      this.animState = this.player.onGround ? (Math.abs(this.player.vx) > 10 ? 'Run' : 'Idle') : 'Fall';
    }

    updateHook(delta, direction) {
      const player = this.player;
      const hook = this.hook;
      hook.cooldown = Math.max(0, hook.cooldown - delta);
      if (hook.state === 'idle') return false;

      if (hook.state === 'launching') {
        hook.timer += delta;
        if (hook.timer >= 0.16) {
          hook.anchor = hook.target;
          const dx = player.x - hook.anchor.x;
          const dy = (player.footY - 28) - hook.anchor.y;
          hook.ropeLength = Math.max(70, Math.hypot(dx, dy));
          hook.state = 'attached';
          hook.timer = 0;
          this.animState = 'HookSwing';
        }
        return true;
      }

      const anchor = hook.anchor;
      if (!anchor) { this.releaseHook(); return false; }
      if (this.pullHeld || this.keys.has('KeyF')) {
        this.animState = 'HookPull';
        const dx = anchor.x - player.x;
        const dy = anchor.surfaceY - player.footY;
        const distance = Math.hypot(dx, dy);
        const speed = this.characters.active.id === 'eleanor' ? 635 : 535;
        if (distance < 34) {
          player.x = anchor.x;
          player.footY = anchor.surfaceY;
          player.shadowY = anchor.surfaceY;
          player.vx = 0; player.vy = 0; player.onGround = true;
          this.hook = { state: 'idle', anchor: null, target: null, timer: 0, ropeLength: 0, cooldown: 0.65 };
          this.pullHeld = false;
          if (this.world.activeLayer !== 'rooftop') this.world.setLayer('rooftop');
        } else {
          const step = Math.min(distance, speed * delta);
          player.x += dx / distance * step;
          player.footY += dy / distance * step;
          player.vx = dx / distance * speed;
          player.vy = dy / distance * speed;
          player.onGround = false;
        }
        return true;
      }

      // Pendulum-like swing: gravity adds momentum, rope-length constraint removes
      // radial movement, leaving tangential speed for a readable swing arc.
      this.animState = 'HookSwing';
      player.vx += direction * 610 * delta;
      player.vy += 760 * delta;
      player.x += player.vx * delta;
      player.footY += player.vy * delta;
      const dx = player.x - anchor.x;
      const dy = (player.footY - 28) - anchor.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const nx = dx / distance, ny = dy / distance;
      player.x = anchor.x + nx * hook.ropeLength;
      player.footY = anchor.y + ny * hook.ropeLength + 28;
      const radialSpeed = player.vx * nx + player.vy * ny;
      player.vx -= radialSpeed * nx;
      player.vy -= radialSpeed * ny;
      player.x = clamp(player.x, 22, this.world.activeDistrict.worldWidth - 22);
      player.onGround = false;
      return true;
    }

    resetPlayerPosition(resetX = false) {
      const player = this.player;
      const district = this.world.activeDistrict;
      if (resetX) {
        player.x = Math.min(100, this.world.activeDistrict.worldWidth - 80);
        this.cameraX = 0;
        this.cameraY = 0;
        this.lastSector = 1;
      }
      player.vx = 0;
      player.vy = 0;
      player.onGround = true;
      player.walkPhase = 0;
      const referenceY = this.world.activeLayer === 'rooftop' ? district.baseline - 230 : district.baseline;
      const groundY = this.getGroundYAt(player.x, this.world.activeLayer, referenceY);
      player.footY = groundY ?? district.baseline;
      player.shadowY = player.footY;
      this.nearbyMarker = null;
      this.hook = { state: 'idle', anchor: null, target: null, timer: 0, ropeLength: 0, cooldown: 0 };
      this.pullHeld = false;
    }

    getRoofPlatforms(district = this.world.activeDistrict) {
      return district.buildings.map(building => ({
        left: building.x + 17,
        right: building.x + building.w - 17,
        y: district.baseline - building.h - 7,
        building
      }));
    }

    getGroundYAt(x, layer = this.world.activeLayer, referenceY = this.player.footY) {
      const district = this.world.activeDistrict;
      if (layer === 'street') return district.baseline;
      const platforms = this.getRoofPlatforms(district).filter(platform => x >= platform.left && x <= platform.right);
      if (!platforms.length) return null;
      platforms.sort((a, b) => Math.abs(a.y - referenceY) - Math.abs(b.y - referenceY));
      return platforms[0].y;
    }

    updatePlayer(delta) {
      if (!delta) return;
      const player = this.player;
      const district = this.world.activeDistrict;
      const layer = this.world.activeLayer;
      const goingLeft = this.keys.has('KeyA') || this.keys.has('ArrowLeft') || this.touchInput.left;
      const goingRight = this.keys.has('KeyD') || this.keys.has('ArrowRight') || this.touchInput.right;
      const direction = (goingRight ? 1 : 0) - (goingLeft ? 1 : 0);
      const sprinting = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
      const agility = this.characters.active.stats.agility || 70;
      const walkSpeed = 190 + agility * 0.54;
      const targetVelocity = direction * walkSpeed * (sprinting ? 1.48 : 1);
      if (direction) player.facing = direction;

      if (this.hook.state === 'idle') this.hook.cooldown = Math.max(0, this.hook.cooldown - delta);
      if (this.hook.state !== 'idle') {
        this.updateHook(delta, direction);
        if (this.hook.state === 'idle') this.nearbyMarker = this.getNearbyMarker();
        this.updateAnimationState();
        this.updateCamera();
        this.updateSectorIndicator();
        return;
      }

      player.vx += (targetVelocity - player.vx) * Math.min(1, delta * (direction ? 15 : 12));
      if (!direction && Math.abs(player.vx) < 3) player.vx = 0;

      // Jump starts with a subtle anticipation and a stronger launch than the old test.
      if (this.jumpQueued) {
        if (player.onGround) {
          player.vy = -500;
          player.onGround = false;
          player.shadowY = player.footY;
          this.landPulse = 0;
        }
        this.jumpQueued = false;
      }

      const oldX = player.x;
      const requestedX = clamp(player.x + player.vx * delta, 22, district.worldWidth - 22);
      if (layer === 'rooftop' && player.onGround && Math.abs(requestedX - oldX) > 0.001) {
        const nextGround = this.getGroundYAt(requestedX, 'rooftop', player.footY);
        if (nextGround === null) {
          player.onGround = false;
          player.vy = Math.max(player.vy, 30);
        } else {
          const heightDifference = nextGround - player.footY;
          if (heightDifference < -30) {
            // A higher ledge blocks horizontal motion until the player jumps or grapples.
            player.vx = 0;
          } else if (heightDifference <= 22) {
            player.footY = nextGround;
            player.shadowY = nextGround;
          } else {
            player.onGround = false;
            player.vy = Math.max(player.vy, 35);
          }
        }
      }
      if (!(layer === 'rooftop' && player.onGround && Math.abs(requestedX - oldX) > 0.001 && player.vx === 0)) {
        player.x = requestedX;
      }

      if (layer === 'street') {
        player.shadowY = district.baseline;
        if (!player.onGround) {
          const oldFootY = player.footY;
          player.vy += 1120 * delta;
          const nextFootY = player.footY + player.vy * delta;
          let landing = null;
          if (player.vy >= 0) {
            for (const platform of this.getRoofPlatforms(district)) {
              if (player.x >= platform.left && player.x <= platform.right && oldFootY <= platform.y && nextFootY >= platform.y) {
                if (!landing || platform.y < landing.y) landing = platform;
              }
            }
          }
          if (landing) {
            player.footY = landing.y; player.shadowY = landing.y;
            player.vy = 0; player.onGround = true;
            this.world.setLayer('rooftop');
            this.landPulse = 1;
          } else if (nextFootY >= district.baseline) {
            player.footY = district.baseline; player.vy = 0; player.onGround = true;
            this.landPulse = 1;
          } else {
            player.footY = nextFootY;
          }
        } else {
          player.footY = district.baseline;
          player.vy = 0;
        }
      } else if (!player.onGround) {
        const oldFootY = player.footY;
        player.vy += 1120 * delta;
        const nextFootY = player.footY + player.vy * delta;
        let landing = null;
        if (player.vy >= 0) {
          for (const platform of this.getRoofPlatforms(district)) {
            if (player.x >= platform.left && player.x <= platform.right && oldFootY <= platform.y && nextFootY >= platform.y) {
              if (!landing || platform.y < landing.y) landing = platform;
            }
          }
        }
        if (landing) {
          player.footY = landing.y; player.shadowY = landing.y;
          player.vy = 0; player.onGround = true; this.landPulse = 1;
        } else {
          player.footY = nextFootY;
          const shadowGround = this.getGroundYAt(player.x, 'rooftop', player.shadowY);
          if (shadowGround !== null) player.shadowY = shadowGround;
          if (player.footY >= district.baseline) {
            player.footY = district.baseline; player.shadowY = district.baseline;
            player.vy = 0; player.onGround = true;
            this.world.setLayer('street');
          }
        }
      } else {
        const currentGround = this.getGroundYAt(player.x, 'rooftop', player.footY);
        if (currentGround === null) {
          player.onGround = false; player.vy = 30;
        } else {
          player.footY = currentGround; player.shadowY = currentGround; player.vy = 0;
        }
      }

      if (player.onGround && Math.abs(player.vx) > 8) player.walkPhase += Math.abs(player.vx) * delta * 0.055;
      this.landPulse = Math.max(0, this.landPulse - delta * 2.8);
      this.nearbyMarker = this.getNearbyMarker();
      this.updateAnimationState();
      this.updateCamera();
      this.updateSectorIndicator();
    }

    updateSectorIndicator() {
      const sector = Math.floor(this.cameraX / WORLD_SEGMENT_WIDTH) + 1;
      if (sector !== this.lastSector) {
        this.lastSector = sector;
        const summary = document.querySelector('#matrix-summary');
        if (summary) summary.textContent = `14 × 8 GRID · SECTOR ${sector}/${WORLD_SEGMENT_COUNT} · ${this.world.activeLayer === 'street' ? 'STREET' : 'ROOFTOP'}`;
        const coordinates = document.querySelector('#map-coordinates');
        if (coordinates) coordinates.textContent = `SECTOR ${String(sector).padStart(2, '0')} · ${this.world.activeLayer === 'street' ? 'STREET' : 'ROOF'}`;
      }
    }

    updateAnimationState() {
      const player = this.player;
      if (this.hook.state === 'launching') this.animState = 'HookLaunch';
      else if (this.hook.state === 'attached' && this.pullHeld) this.animState = 'HookPull';
      else if (this.hook.state === 'attached') this.animState = 'HookSwing';
      else if (!player.onGround) this.animState = player.vy < 0 ? 'Jump' : 'Fall';
      else if (Math.abs(player.vx) > 235) this.animState = 'Run';
      else if (Math.abs(player.vx) > 10) this.animState = 'Walk';
      else this.animState = 'Idle';
    }

    updateCamera() {
      const width = this.world.activeDistrict.worldWidth || this.width;
      const desired = this.player.x - this.width * 0.39;
      this.cameraX = clamp(desired, 0, Math.max(0, width - this.width));
      // Vertical follow keeps the player visible when grappling to tall roofs or Big Ben.
      this.cameraY = Math.min(0, this.player.footY - this.height * 0.58);
    }

    getNearbyMarker(maxDistance = 78) {
      if (!this.player.onGround || this.hook.state !== 'idle') return null;
      const district = this.world.activeDistrict;
      const player = this.player;
      const layer = this.world.activeLayer;
      let nearest = null;
      let bestDistance = maxDistance;
      for (const marker of district.markers) {
        if (marker.layer !== layer) continue;
        if (marker.type === 'collectible' && this.world.isCollected(marker.id)) continue;
        const markerY = layer === 'rooftop' ? marker.roofY : marker.streetY;
        const dx = marker.x - player.x;
        const dy = markerY - player.footY;
        const distance = Math.hypot(dx, dy * 0.75);
        if (distance < bestDistance) { bestDistance = distance; nearest = marker; }
      }
      return nearest;
    }

    interactNearest() {
      const marker = this.getNearbyMarker();
      if (!marker) {
        showToast('Hedef uzakta veya başka bir seviyede. Fiziksel olarak yaklaş; çatılar için G kanca, F çekil.');
        return false;
      }
      if (this.onMarkerClick) this.onMarkerClick(marker);
      return true;
    }

    draw() {
      const ctx = this.ctx;
      const W = this.width, H = this.height;
      const district = this.world.activeDistrict;
      const layer = this.world.activeLayer;
      const baseline = district.baseline;
      ctx.clearRect(0, 0, W, H);
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, district.sky[0]); sky.addColorStop(.53, district.sky[1]); sky.addColorStop(1, district.sky[2]);
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      this.drawMoonGlow(district);
      this.drawParallaxSkyline(district, .12, baseline - 80, '#222b29', 0);
      this.drawParallaxSkyline(district, .27, baseline - 23, '#1a211f', 1);
      this.drawFog(district);

      // Only the foreground world follows the player; skyline and fog move more slowly.
      ctx.save();
      const shake = this.combat && this.combat.screenShake > 0 ? this.combat.screenShakePower * (this.combat.screenShake / .14) : 0;
      ctx.translate((Math.random()-.5)*shake - this.cameraX, (Math.random()-.5)*shake - this.cameraY);
      this.drawSmoke(district);
      this.drawCranes(district);
      district.buildings.forEach((building, index) => {
        if (building.x + building.w >= this.cameraX - 220 && building.x <= this.cameraX + W + 220) {
          this.drawBuilding(building, baseline, index);
        }
      });
      if (district.ambience === 'water') this.drawWaterfront(district);
      this.drawStreetOrRoofRoute(district, baseline, layer);
      this.drawLampPosts(district, baseline);
      this.drawPeople(district);
      this.drawHook();
      if (this.combat) this.combat.drawVfx();
      this.drawProtagonist(district, baseline, layer);
      this.drawMarkers(district, layer);
      ctx.restore();
      this.drawEdgeVignette(W, H);
    }
    drawMoonGlow(district) {
      const ctx = this.ctx;
      const glow = ctx.createRadialGradient(930, 100, 4, 930, 100, 390);
      glow.addColorStop(0, district.ambience === 'smoke' ? 'rgba(206,177,116,.15)' : 'rgba(207,209,190,.1)');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow; ctx.fillRect(520, 0, 680, 400);
    }
    drawParallaxSkyline(district, speed, baseY, color, layerIndex) {
      const ctx = this.ctx;
      const offset = (this.cameraX * speed + this.elapsed * speed * 18) % 350;
      const widths = [58, 90, 42, 110, 71, 48, 96, 62, 81, 50, 104, 63];
      ctx.fillStyle = color;
      for (let repeat = -1; repeat < 5; repeat++) {
        let x = repeat * 350 - offset;
        widths.forEach((w, i) => {
          const h = 50 + ((i * 37 + layerIndex * 13) % 100);
          ctx.fillRect(x, baseY - h, w - 5, h + 100);
          if ((i + layerIndex) % 3 === 0) {
            ctx.beginPath(); ctx.moveTo(x - 3, baseY - h); ctx.lineTo(x + (w - 5) / 2, baseY - h - 13); ctx.lineTo(x + w - 7, baseY - h); ctx.closePath(); ctx.fill();
          }
          x += w;
        });
      }
      // Distant domes and clock silhouettes give the skyline a recognisable London profile.
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.ellipse(400 - offset * .5, baseY - 111, 32, 25, 0, Math.PI, 0); ctx.fill();
      ctx.fillRect(380 - offset * .5, baseY - 112, 40, 75);
      ctx.fillRect(920 - offset * .35, baseY - 162, 16, 130);
      ctx.beginPath(); ctx.moveTo(915 - offset * .35, baseY - 162); ctx.lineTo(928 - offset * .35, baseY - 188); ctx.lineTo(941 - offset * .35, baseY - 162); ctx.fill();
    }
    drawFog(district) {
      const ctx = this.ctx;
      const fogColor = district.ambience === 'water' ? 'rgba(161,185,183,' : 'rgba(201,198,180,';
      for (let i = 0; i < 5; i++) {
        const x = ((i * 315 + this.elapsed * (7 + i * 2)) % 1450) - 120;
        const y = 300 + i * 24 + Math.sin(this.elapsed * .22 + i) * 7;
        const alpha = .035 + (i % 3) * .012;
        const gradient = ctx.createRadialGradient(x, y, 1, x, y, 170 + i * 12);
        gradient.addColorStop(0, `${fogColor}${alpha})`); gradient.addColorStop(1, `${fogColor}0)`);
        ctx.fillStyle = gradient; ctx.fillRect(x - 190, y - 75, 380, 150);
      }
      const lowFog = ctx.createLinearGradient(0, 345, 0, 510);
      lowFog.addColorStop(0, 'rgba(173,178,161,0)'); lowFog.addColorStop(.65, 'rgba(173,178,161,.045)'); lowFog.addColorStop(1, 'rgba(173,178,161,.015)');
      ctx.fillStyle = lowFog; ctx.fillRect(0, 330, this.width, 200);
    }
    drawSmoke(district) {
      const ctx = this.ctx;
      const sources = district.chimneys?.length ? district.chimneys : district.buildings.filter(b => ['factory', 'pub', 'warehouse'].includes(b.style)).map(b => ({ x: b.x + b.w * .73, height: 75 + b.h * .25 }));
      sources.forEach((source, sourceIndex) => {
        if (source.x < this.cameraX - 100 || source.x > this.cameraX + this.width + 100) return;
        const baseY = district.baseline - source.height;
        for (let i = 0; i < 6; i++) {
          const phase = this.elapsed * (9 + sourceIndex) + i * 17 + source.x * .06;
          const x = source.x + Math.sin(phase * .03) * (12 + i * 4) + Math.cos(phase * .01) * 5;
          const y = baseY - ((phase * 3 + i * 27) % 120);
          const radius = 8 + i * 2.8;
          ctx.fillStyle = `rgba(17,20,19,${Math.max(.015, .09 - i * .012)})`;
          ctx.beginPath(); ctx.ellipse(x, y, radius * 1.25, radius, .25, 0, Math.PI * 2); ctx.fill();
        }
      });
    }
    drawCranes(district) {
      if (!district.cranes) return;
      const ctx = this.ctx;
      district.cranes.forEach(crane => {
        if (crane.x + 140 < this.cameraX - 80 || crane.x > this.cameraX + this.width + 80) return;
        const y = district.baseline - crane.height;
        ctx.strokeStyle = '#171d1b'; ctx.lineWidth = 7;
        ctx.beginPath(); ctx.moveTo(crane.x, district.baseline); ctx.lineTo(crane.x, y); ctx.lineTo(crane.x + 120, y); ctx.stroke();
        ctx.lineWidth = 2; ctx.strokeStyle = '#7a7b6e';
        ctx.beginPath(); ctx.moveTo(crane.x + 20, y + 3); ctx.lineTo(crane.x + 75, y + 3); ctx.lineTo(crane.x + 75, y + 55); ctx.stroke();
        ctx.fillStyle = '#171c1a'; ctx.fillRect(crane.x + 64, y + 48, 22, 19);
        ctx.fillStyle = '#8d7951'; ctx.fillRect(crane.x - 4, y - 4, 9, 9);
      });
    }
    drawBuilding(building, baseline, index) {
      const ctx = this.ctx;
      const { x, w, h, style, floors = 3 } = building;
      const y = baseline - h;
      const facade = style === 'factory' ? ['#3b3b34', '#272923'] : style === 'clocktower' ? ['#69665a', '#37382f'] : style === 'stone-palace' ? ['#5a594f', '#34362f'] : ['#494941', '#2a2c26'];
      const gradient = ctx.createLinearGradient(x, y, x + w, baseline);
      gradient.addColorStop(0, facade[0]); gradient.addColorStop(1, facade[1]);
      ctx.fillStyle = gradient; ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = style === 'clocktower' ? '#91856a' : '#5e5e52'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);

      // Roofline, cornice and period-appropriate silhouettes.
      if (['chapel', 'terrace', 'tenement'].includes(style)) {
        ctx.fillStyle = '#20231f'; ctx.beginPath(); ctx.moveTo(x - 8, y + 8); ctx.lineTo(x + w * .5, y - (style === 'chapel' ? 26 : 15)); ctx.lineTo(x + w + 8, y + 8); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#7a7665'; ctx.lineWidth = 2; ctx.stroke();
      } else if (style === 'stone-palace') {
        ctx.fillStyle = '#4b4b41'; ctx.fillRect(x - 3, y - 10, w + 6, 13);
        for (let i = 0; i < Math.max(2, Math.floor(w / 42)); i++) {
          const tx = x + 10 + i * ((w - 20) / Math.max(1, Math.floor(w / 42) - 1));
          ctx.fillStyle = '#6b6858'; ctx.fillRect(tx, y - 19, 8, 9);
        }
      } else if (style === 'factory') {
        ctx.fillStyle = '#20231f';
        for (let sx = x; sx < x + w; sx += 48) {
          ctx.beginPath(); ctx.moveTo(sx, y); ctx.lineTo(sx + 24, y - 16); ctx.lineTo(sx + 48, y); ctx.closePath(); ctx.fill();
        }
        ctx.strokeStyle = '#656458'; ctx.lineWidth = 2; ctx.strokeRect(x + 4, y - 2, w - 8, 7);
      } else {
        ctx.fillStyle = '#252720'; ctx.fillRect(x - 4, y - 7, w + 8, 10);
        ctx.strokeStyle = '#6b6a5c'; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, 7);
      }

      // Floor bands and tall sash windows.
      const floorHeight = (h - 26) / floors;
      for (let floor = 0; floor < floors; floor++) {
        const fy = y + 15 + floor * floorHeight;
        ctx.strokeStyle = 'rgba(151,146,124,.18)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x + 3, fy + floorHeight - 5); ctx.lineTo(x + w - 3, fy + floorHeight - 5); ctx.stroke();
        const columns = Math.max(2, Math.floor(w / (style === 'warehouse' ? 38 : 31)));
        const gap = w / columns;
        for (let col = 0; col < columns; col++) {
          const wx = x + gap * col + gap * .28;
          const ww = Math.max(7, gap * .40);
          const wh = Math.min(22, floorHeight * .52);
          const wy = fy + Math.max(4, (floorHeight - wh) * .39);
          ctx.fillStyle = (floor + col + index) % 5 === 0 ? '#827650' : '#171d1c';
          ctx.fillRect(wx, wy, ww, wh);
          ctx.strokeStyle = '#6d6a58'; ctx.lineWidth = 1; ctx.strokeRect(wx, wy, ww, wh);
          ctx.strokeStyle = 'rgba(180,166,125,.38)';
          ctx.beginPath(); ctx.moveTo(wx + ww * .5, wy); ctx.lineTo(wx + ww * .5, wy + wh); ctx.moveTo(wx, wy + wh * .45); ctx.lineTo(wx + ww, wy + wh * .45); ctx.stroke();
          if (style === 'stone-palace' || style === 'clocktower') {
            ctx.fillStyle = '#777260'; ctx.fillRect(wx - 3, wy - 3, ww + 6, 3);
          }
        }
      }

      // Heavy doors and stone arch detail.
      if (style === 'warehouse' || style === 'factory') {
        const doorW = Math.min(37, w * .22), doorH = Math.min(58, h * .2);
        ctx.fillStyle = '#171b18'; ctx.fillRect(x + w * .5 - doorW / 2, baseline - doorH, doorW, doorH);
        ctx.strokeStyle = '#716b58'; ctx.strokeRect(x + w * .5 - doorW / 2, baseline - doorH, doorW, doorH);
        ctx.beginPath(); ctx.arc(x + w * .5, baseline - doorH, doorW / 2, Math.PI, 0); ctx.stroke();
      }
      if (style === 'pub') {
        ctx.fillStyle = '#27231a'; ctx.fillRect(x + 15, y + h * .39, w - 30, 20);
        ctx.strokeStyle = '#b69a5c'; ctx.strokeRect(x + 15, y + h * .39, w - 30, 20);
        ctx.fillStyle = '#e1c17c'; ctx.font = '9px Georgia'; ctx.textAlign = 'center'; ctx.fillText('THE LANTERN', x + w / 2, y + h * .39 + 13);
      }
      if (style === 'clocktower') this.drawClocktowerDetail(x, y, w, h);
      if (style === 'chapel') {
        ctx.fillStyle = '#b6a778'; ctx.beginPath(); ctx.arc(x + w / 2, y + 25, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2a302c'; ctx.beginPath(); ctx.arc(x + w / 2, y + 25, 7, 0, Math.PI * 2); ctx.fill();
      }
      if (style !== 'clocktower' && (style === 'terrace' || style === 'tenement' || style === 'warehouse')) {
        ctx.fillStyle = '#292b25'; ctx.fillRect(x + w * .72, y - 28, 15, 28);
        ctx.fillStyle = '#646253'; ctx.fillRect(x + w * .72 - 3, y - 29, 21, 5);
      }
    }
    drawClocktowerDetail(x, y, w, h) {
      const ctx = this.ctx;
      ctx.fillStyle = '#282c26';
      ctx.fillRect(x + w * .23, y - 23, w * .54, 27);
      ctx.beginPath(); ctx.moveTo(x + w * .15, y - 20); ctx.lineTo(x + w * .5, y - 72); ctx.lineTo(x + w * .85, y - 20); ctx.closePath(); ctx.fill();
      const cx = x + w / 2, cy = y + 62;
      ctx.fillStyle = '#c8b783'; ctx.beginPath(); ctx.arc(cx, cy, 24, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#282c26'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#252923'; ctx.beginPath(); ctx.arc(cx, cy, 19, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#d4c38c'; ctx.lineWidth = 1;
      for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6;
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 14, cy + Math.sin(a) * 14); ctx.lineTo(cx + Math.cos(a) * 17, cy + Math.sin(a) * 17); ctx.stroke();
      }
      ctx.strokeStyle = '#e4d6a4'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx - 7, cy - 8); ctx.moveTo(cx, cy); ctx.lineTo(cx + 10, cy + 2); ctx.stroke();
      ctx.fillStyle = '#b9a975'; ctx.fillRect(x + w * .5 - 2, y - 82, 4, 10);
    }
    drawWaterfront(district) {
      const ctx = this.ctx;
      const y = district.baseline + 5;
      const gradient = ctx.createLinearGradient(0, y, 0, this.height);
      gradient.addColorStop(0, '#354749'); gradient.addColorStop(1, '#161e20');
      ctx.fillStyle = gradient; ctx.fillRect(0, y, district.worldWidth || this.width, this.height - y);
      for (let row = 0; row < 6; row++) {
        const yy = y + 17 + row * 18;
        ctx.strokeStyle = `rgba(173,188,171,${.12 - row * .012})`; ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = Math.max(-40, this.cameraX - 80); x < Math.min(district.worldWidth || this.width, this.cameraX + this.width + 80); x += 75) {
          const waveX = x + Math.sin(this.elapsed * .7 + row + x * .01) * 10;
          ctx.moveTo(waveX, yy); ctx.lineTo(waveX + 30, yy - 1);
        }
        ctx.stroke();
      }
      ctx.fillStyle = '#2a302a'; ctx.fillRect(0, y - 5, district.worldWidth || this.width, 9);
      ctx.strokeStyle = '#6c6650'; ctx.lineWidth = 2;
      for (let x = Math.max(0, this.cameraX - 40); x < Math.min(district.worldWidth || this.width, this.cameraX + this.width + 40); x += 55) { ctx.beginPath(); ctx.moveTo(x, y - 12); ctx.lineTo(x, y + 12); ctx.stroke(); }
    }
    drawStreetOrRoofRoute(district, baseline, layer) {
      const ctx = this.ctx;
      const worldWidth = district.worldWidth || this.width;
      const roadY = baseline + 4;
      const streetGradient = ctx.createLinearGradient(0, roadY, 0, this.height);
      streetGradient.addColorStop(0, '#34352e'); streetGradient.addColorStop(1, '#22251f');
      ctx.fillStyle = streetGradient; ctx.fillRect(0, roadY, worldWidth, this.height - roadY);
      ctx.strokeStyle = 'rgba(202,189,151,.14)'; ctx.lineWidth = 1;
      for (let x = 0; x < worldWidth; x += 35) {
        ctx.beginPath(); ctx.moveTo(x, roadY + 25); ctx.lineTo(x + 16, roadY + 35); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + 13, roadY + 69); ctx.lineTo(x + 33, roadY + 78); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(202,189,151,.32)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, roadY + 3); ctx.lineTo(worldWidth, roadY + 3); ctx.stroke();

      // Each roof has its own visible ledge. Blank gaps and different heights are
      // intentional: players must jump or grapple rather than being guided by a bridge.
      const platforms = this.getRoofPlatforms(district);
      platforms.forEach((platform, index) => {
        ctx.save();
        ctx.setLineDash([6, 7]);
        ctx.lineWidth = layer === 'rooftop' ? 2.5 : 1.1;
        ctx.strokeStyle = layer === 'rooftop' ? 'rgba(217,181,103,.86)' : 'rgba(217,181,103,.24)';
        ctx.shadowColor = '#c4a05c'; ctx.shadowBlur = layer === 'rooftop' ? 7 : 1;
        ctx.beginPath(); ctx.moveTo(platform.left, platform.y); ctx.lineTo(platform.right, platform.y); ctx.stroke();
        ctx.restore();
        const anchorColor = layer === 'rooftop' ? '#e3c47b' : 'rgba(216,187,123,.54)';
        ctx.fillStyle = anchorColor;
        [platform.left + 22, (platform.left + platform.right) * 0.5, platform.right - 22].forEach(anchorX => {
          ctx.save(); ctx.translate(anchorX, platform.y - 6); ctx.rotate(Math.PI / 4);
          ctx.fillRect(-2.5, -2.5, 5, 5); ctx.restore();
        });
        const next = platforms[index + 1];
        if (next && Math.abs(next.y - platform.y) > 38) {
          ctx.strokeStyle = 'rgba(225,196,127,.38)'; ctx.lineWidth = 1;
          ctx.setLineDash([2, 5]);
          ctx.beginPath(); ctx.moveTo(platform.right - 2, platform.y - 1); ctx.lineTo(next.left + 2, next.y - 1); ctx.stroke();
          ctx.setLineDash([]);
        }
      });
    }
    drawLampPosts(district, baseline) {
      const ctx = this.ctx;
      const base = district.id === 'westminster' ? [90, 350, 680, 1100] : district.id === 'docks' ? [100, 560, 1125] : [85, 380, 740, 1090];
      const worldWidth = district.worldWidth || this.width;
      for (let sector = 0; sector < WORLD_SEGMENT_COUNT; sector++) {
        base.forEach((localX, index) => {
          const x = sector * WORLD_SEGMENT_WIDTH + localX;
          const y = baseline + (district.ambience === 'water' ? -1 : 1);
          const glow = ctx.createRadialGradient(x, y - 49, 1, x, y - 49, 49);
          glow.addColorStop(0, 'rgba(235,190,100,.22)'); glow.addColorStop(1, 'rgba(235,190,100,0)');
          ctx.fillStyle = glow; ctx.fillRect(x - 55, y - 104, 110, 110);
          ctx.strokeStyle = '#171b17'; ctx.lineWidth = 4;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 45); ctx.lineTo(x + (index % 2 ? -9 : 9), y - 53); ctx.stroke();
          ctx.fillStyle = '#191b16'; ctx.fillRect(x - 6, y - 61, 12, 16);
          ctx.fillStyle = '#c9a35f'; ctx.fillRect(x - 3, y - 57, 6, 8);
          ctx.strokeStyle = '#77715a'; ctx.lineWidth = 1; ctx.strokeRect(x - 6, y - 61, 12, 16);
        });
      }
    }

    drawHumanoid(x, footY, options = {}) {
      const ctx = this.ctx;
      const kind = options.kind || 'civilian';
      const facing = options.facing || 1;
      const phase = options.phase || 0;
      const moving = options.moving !== false;
      const scale = options.scale || 1;
      const body = kind === 'guard' ? '#2a2923' : kind === 'boss' ? '#352c25' : kind === 'ada' ? '#313a32' : '#3a3830';
      const accent = kind === 'guard' || kind === 'boss' ? '#8f4e43' : kind === 'ada' ? '#a9b79a' : '#9b8759';
      const stride = moving ? Math.sin(phase) * 5 * scale : 0;
      const armSwing = moving ? Math.sin(phase + Math.PI) * 4 * scale : 0;
      ctx.save(); ctx.translate(x, footY); ctx.scale(scale, scale);
      // Legs with knees and boots create a consistent human proportion.
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#171915'; ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-4, -10); ctx.lineTo(-6 - stride, -2); ctx.lineTo(-8 - stride * 1.1, 0);
      ctx.moveTo(4, -10); ctx.lineTo(6 + stride, -3); ctx.lineTo(8 + stride * 1.1, 0);
      ctx.stroke();
      // Arms are jointed, with a hand at either end.
      ctx.strokeStyle = body; ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-7, -31); ctx.lineTo(-12 - armSwing, -20); ctx.lineTo(-10 - armSwing, -16);
      ctx.moveTo(7, -31); ctx.lineTo(12 + armSwing, -21); ctx.lineTo(11 + armSwing, -17);
      ctx.stroke();
      // Long Victorian coat, waistcoat and collar.
      ctx.fillStyle = body;
      ctx.beginPath(); ctx.moveTo(-8, -35); ctx.lineTo(8, -35); ctx.lineTo(12, -11);
      ctx.lineTo(7, -7); ctx.lineTo(0, -13); ctx.lineTo(-7, -7); ctx.lineTo(-12, -11); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = accent; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-2, -33); ctx.lineTo(2, -16); ctx.stroke();
      ctx.fillStyle = '#161713'; ctx.beginPath(); ctx.arc(0, -42, 6.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#8e8063'; ctx.beginPath(); ctx.arc(0, -42, 5.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#171915'; ctx.fillRect(-7, -48, 14, 3);
      if (kind === 'guard' || kind === 'boss') {
        ctx.fillStyle = '#20221c'; ctx.fillRect(-7, -51, 14, 4);
        ctx.fillStyle = accent; ctx.fillRect(-5, -35, 10, 3);
      } else {
        ctx.fillStyle = '#252720'; ctx.fillRect(-6, -50, 12, 3);
      }
      // Nose, eye and sideburn are deliberately subtle in the low-light palette.
      ctx.fillStyle = '#d0bd95'; ctx.fillRect(facing > 0 ? 2 : -3, -43, 2, 1.5);
      ctx.fillStyle = '#171915'; ctx.fillRect(facing > 0 ? 3 : -4, -44, 1.5, 1.5);
      ctx.restore();
    }

    drawPeople(district) {
      for (const person of district.people || []) {
        const patrolOffset = Math.sin(this.elapsed * 0.65 + person.phase) * person.patrol;
        const x = person.x + patrolOffset;
        if (x < this.cameraX - 70 || x > this.cameraX + this.width + 70) continue;
        const layer = person.layer;
        let footY = layer === 'street' ? district.baseline : person.roofY;
        if (layer === 'rooftop') {
          const ground = this.getGroundYAt(x, 'rooftop', footY);
          if (ground === null) continue;
          footY = ground;
        }
        const activeLayer = layer === this.world.activeLayer;
        this.ctx.save(); this.ctx.globalAlpha = activeLayer ? 0.95 : 0.58;
        this.drawHumanoid(x, footY, {
          kind: person.kind, facing: Math.cos(this.elapsed * 0.65 + person.phase) >= 0 ? 1 : -1,
          phase: this.elapsed * 2 + person.phase, scale: person.kind === 'guard' ? 1 : 0.92
        });
        if (person.kind === 'guard' && activeLayer) {
          this.ctx.fillStyle = 'rgba(102,44,37,.88)'; this.ctx.fillRect(x - 15, footY - 66, 30, 4);
          const combatEnemy = this.combat?.enemies.get(person.id);
          if (combatEnemy) { this.ctx.fillStyle = '#a95e4c'; this.ctx.fillRect(x - 15, footY - 66, 30 * combatEnemy.health / combatEnemy.maxHealth, 4); }
          this.ctx.fillStyle = '#dfb5a3'; this.ctx.font = '7px Inter, sans-serif'; this.ctx.textAlign = 'center';
          this.ctx.fillText(combatEnemy?.state === 'stunned' ? 'SERSEMLEDİ' : 'IRON COGS', x, footY - 56);
        }
        this.ctx.restore();
      }
    }

    drawProtagonist(district, baseline, layer) {
      const ctx = this.ctx;
      const character = this.characters.active;
      const player = this.player;
      const x = player.x;
      const isMoving = player.onGround && Math.abs(player.vx) > 12;
      const running = Math.abs(player.vx) > 235;
      const bob = player.onGround ? (isMoving ? Math.abs(Math.sin(player.walkPhase * 2)) * -2 : Math.sin(this.elapsed * 2.2) * .55) : 0;
      const y = player.footY + bob;
      const stride = isMoving ? Math.sin(player.walkPhase) * (running ? 6.5 : 4.5) : 0;
      const facing = player.facing || 1;
      const airborne = !player.onGround || this.hook.state !== 'idle';
      ctx.save();
      const shadowOffset = Math.max(0, player.footY - player.shadowY);
      ctx.fillStyle = `rgba(0,0,0,${Math.max(.12, .34 - shadowOffset / 650)})`;
      ctx.beginPath(); ctx.ellipse(x, player.shadowY + 1, Math.max(7, 17 - shadowOffset * .025), 4, 0, 0, Math.PI * 2); ctx.fill();

      // Coat hem flares while running/jumping. Body remains a full human silhouette.
      const coatSwing = airborne ? -6 : isMoving ? Math.sin(player.walkPhase * 1.35) * (running ? 4 : 2) : 0;
      ctx.fillStyle = character.id === 'eleanor' ? '#303c32' : '#343126';
      ctx.beginPath();
      ctx.moveTo(x - 9, y - 38); ctx.lineTo(x + 9, y - 38);
      ctx.lineTo(x + 14 + coatSwing, y - 7); ctx.lineTo(x + 6, y - 4);
      ctx.lineTo(x, y - 13); ctx.lineTo(x - 8, y - 5);
      ctx.lineTo(x - 14 - coatSwing * .25, y - 8); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = character.id === 'eleanor' ? '#9aab91' : '#ad9257'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x - 1, y - 35); ctx.lineTo(x + 3, y - 12); ctx.stroke();
      // Arms move opposite to the legs. In the air they extend to balance the jump.
      const arm = airborne ? -8 : stride * .68;
      ctx.strokeStyle = '#171915'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath();
      const combatAttack = this.combat?.attack;
      const attackTotal = combatAttack ? combatAttack.startup + combatAttack.active + combatAttack.recovery : 1;
      const attackProgress = combatAttack ? clamp(combatAttack.timer / attackTotal, 0, 1) : 0;
      const attackActive = !!combatAttack && combatAttack.timer >= combatAttack.startup && combatAttack.timer <= combatAttack.startup + combatAttack.active;
      const attackReach = combatAttack ? (combatAttack.type === 'heavy' ? 28 : 20) * Math.sin(Math.PI * attackProgress) : 0;
      ctx.moveTo(x - 7, y - 32); ctx.lineTo(x - 12 - arm, y - (airborne ? 42 : 21));
      ctx.moveTo(x + 7, y - 32);
      if (attackActive) ctx.lineTo(x + facing * (12 + attackReach), y - (combatAttack.type === 'heavy' ? 42 : 29));
      else ctx.lineTo(x + 12 + arm, y - (airborne ? 39 : 22));
      ctx.stroke();
      if (attackActive) {
        ctx.strokeStyle = character.id === 'eleanor' ? '#d5d9c8' : '#c9ad6b'; ctx.lineWidth = combatAttack.type === 'heavy' ? 4 : 2.5;
        ctx.beginPath(); ctx.moveTo(x + facing * 15, y - 29); ctx.lineTo(x + facing * (34 + attackReach*.45), y - (combatAttack.type === 'heavy' ? 38 : 24)); ctx.stroke();
      }
      // Knee joints and boots give the run/landing cycle a readable silhouette.
      ctx.strokeStyle = '#111410'; ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(x - 5, y - 7); ctx.lineTo(x - 7 - stride, y - 2); ctx.lineTo(x - 8 - stride, y);
      ctx.moveTo(x + 5, y - 7); ctx.lineTo(x + 7 + stride, y - 2); ctx.lineTo(x + 8 + stride, y);
      ctx.stroke();
      ctx.fillStyle = '#151815'; ctx.beginPath(); ctx.arc(x, y - 46, 8.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = character.id === 'eleanor' ? '#7a7059' : '#8e8063';
      ctx.beginPath(); ctx.arc(x, y - 46, 7.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#171915'; ctx.fillRect(x - 9, y - 53, 18, 4);
      ctx.fillStyle = '#24251e'; ctx.fillRect(x - 5, y - 58, 10, 7);
      ctx.fillStyle = '#171915'; ctx.fillRect(x + facing * 3, y - 48, 2, 1.5);

      // Small landing compression makes touching down visibly different from walking.
      if (this.landPulse > 0) {
        ctx.globalAlpha = this.landPulse * 0.28;
        ctx.strokeStyle = '#d8bd80'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(x, player.footY + 2, 18 + (1 - this.landPulse) * 20, 4 + (1 - this.landPulse) * 3, 0, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(10,12,10,.85)'; ctx.fillRect(x - 43, y - 79, 86, 15);
      ctx.strokeStyle = 'rgba(202,169,101,.55)'; ctx.lineWidth = 1; ctx.strokeRect(x - 43, y - 79, 86, 15);
      ctx.fillStyle = '#ead6a7'; ctx.font = '9px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(character.name.toUpperCase(), x, y - 68);
      ctx.restore();
    }

    drawHook() {
      const hook = this.hook;
      if (hook.state === 'idle') return;
      const ctx = this.ctx;
      const player = this.player;
      const startX = player.x + (player.facing || 1) * 8;
      const startY = player.footY - 32;
      const target = hook.state === 'launching' ? hook.target : hook.anchor;
      if (!target) return;
      ctx.save();
      ctx.strokeStyle = hook.state === 'attached' ? '#bca36a' : '#d4c18d';
      ctx.lineWidth = hook.state === 'attached' ? 2.3 : 1.7;
      ctx.setLineDash(hook.state === 'launching' ? [4, 4] : []);
      ctx.shadowColor = '#d4b876'; ctx.shadowBlur = 5;
      ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(target.x, target.y); ctx.stroke();
      ctx.setLineDash([]); ctx.shadowBlur = 8; ctx.fillStyle = '#e2cb8d';
      ctx.beginPath(); ctx.arc(target.x, target.y, hook.state === 'attached' ? 4.5 : 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#28251d'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(target.x, target.y, 8, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    drawMarkers(district, layer) {
      const ctx = this.ctx;
      const currentObjective = questEngine.currentObjective;
      this.markerHits = [];
      district.markers.forEach(marker => {
        if (marker.type === 'collectible' && this.world.isCollected(marker.id)) return;
        if (marker.x < this.cameraX - 220 || marker.x > this.cameraX + this.width + 220) return;
        const markerLayer = marker.layer || 'street';
        const isCurrentLayer = markerLayer === layer;
        const x = marker.x;
        const y = markerLayer === 'rooftop' ? marker.roofY : marker.streetY;
        const activeTarget = currentObjective?.markerId === marker.id;
        const isBoss = marker.type === 'boss';
        const isPerson = marker.type === 'npc' || marker.type === 'boss';
        const isLoot = marker.type === 'collectible';
        const baseColor = activeTarget ? '#eed49a' : isBoss ? '#c27668' : isLoot ? '#ded4b7' : '#a9b3a3';
        const badgeY = isPerson ? y - 66 : y;
        const pulse = activeTarget ? (Math.sin(this.elapsed * 4) + 1) * 2 : 0;
        ctx.save();
        ctx.globalAlpha = isCurrentLayer ? 0.98 : 0.45;
        if (isPerson) {
          this.drawHumanoid(x, y, {
            kind: isBoss ? 'boss' : (marker.id === 'ada' ? 'ada' : 'civilian'),
            facing: marker.id === 'ada' ? 1 : -1, phase: this.elapsed * 1.5 + x * .01,
            moving: false, scale: isBoss ? 1.12 : 1
          });
        }
        if (isBoss && this.combat) {
          const enemy = this.combat.enemies.get(marker.id);
          if (enemy && enemy.alive && isCurrentLayer) {
            ctx.fillStyle = 'rgba(12,12,10,.9)'; ctx.fillRect(x-24,y-87,48,5);
            ctx.fillStyle = '#a34c40'; ctx.fillRect(x-24,y-87,48*enemy.health/enemy.maxHealth,5);
            if (enemy.phase===2) { ctx.fillStyle='#d4a95e'; ctx.fillRect(x-24,y-80,48*enemy.stamina/100,2); }
          }
        }
        if (activeTarget) { ctx.shadowColor = '#e5bf71'; ctx.shadowBlur = 17; }
        ctx.strokeStyle = baseColor; ctx.lineWidth = activeTarget ? 2 : 1;
        ctx.fillStyle = isBoss ? 'rgba(80,35,31,.92)' : isLoot ? 'rgba(37,36,29,.95)' : 'rgba(24,30,25,.92)';
        const radius = isPerson ? 10 : 14;
        ctx.beginPath(); ctx.arc(x, badgeY, radius + pulse * .45, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = baseColor;
        ctx.font = isBoss ? '13px Georgia' : '12px Georgia'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(marker.symbol || '◆', x, badgeY + 1);
        ctx.shadowBlur = 0;
        const label = marker.label;
        ctx.font = `${activeTarget ? '700 ' : ''}9px Inter, sans-serif`;
        const width = Math.min(180, ctx.measureText(label).width + 15);
        ctx.fillStyle = activeTarget ? 'rgba(40,34,22,.95)' : 'rgba(13,16,14,.82)';
        ctx.fillRect(x - width / 2, badgeY - 30, width, 14);
        ctx.strokeStyle = activeTarget ? 'rgba(231,197,123,.7)' : 'rgba(201,194,166,.2)'; ctx.lineWidth = .6;
        ctx.strokeRect(x - width / 2, badgeY - 30, width, 14);
        ctx.fillStyle = activeTarget ? '#f0dba9' : '#d7d1bf'; ctx.fillText(label, x, badgeY - 23);
        if (this.nearbyMarker && this.nearbyMarker.id === marker.id && isCurrentLayer) {
          const prompt = 'E · ETKİLE';
          ctx.font = '700 9px Inter, sans-serif';
          const promptWidth = ctx.measureText(prompt).width + 16;
          ctx.fillStyle = 'rgba(54,45,27,.96)'; ctx.fillRect(x - promptWidth / 2, y + 20, promptWidth, 17);
          ctx.strokeStyle = '#dfbd70'; ctx.lineWidth = 1; ctx.strokeRect(x - promptWidth / 2, y + 20, promptWidth, 17);
          ctx.fillStyle = '#f3d99e'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(prompt, x, y + 28.5);
        }
        ctx.restore();
        // Hit-testing uses screen coordinates after camera scrolling.
        this.markerHits.push({ marker, x: x - this.cameraX, y: badgeY - this.cameraY, radius: isPerson ? 34 : 27 });
      });
    }
    drawEdgeVignette(W, H) {
      const ctx = this.ctx;
      const vignette = ctx.createRadialGradient(W * .5, H * .45, H * .15, W * .5, H * .45, W * .72);
      vignette.addColorStop(0, 'rgba(0,0,0,0)'); vignette.addColorStop(1, 'rgba(0,0,0,.38)');
      ctx.fillStyle = vignette; ctx.fillRect(0, 0, W, H);
      const topGradient = ctx.createLinearGradient(0, 0, 0, 110);
      topGradient.addColorStop(0, 'rgba(5,7,6,.35)'); topGradient.addColorStop(1, 'rgba(5,7,6,0)');
      ctx.fillStyle = topGradient; ctx.fillRect(0, 0, W, 110);
    }
    handleCanvasClick(event) {
      const rect = this.canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) * this.width / rect.width;
      const y = (event.clientY - rect.top) * this.height / rect.height;
      let nearest = null, best = Infinity;
      for (const hit of this.markerHits) {
        const d = Math.hypot(hit.x - x, hit.y - y);
        if (d <= hit.radius && d < best) { best = d; nearest = hit; }
      }
      if (!nearest) {
        showToast('Burada etkileşim yok. Kişilere ve eşyalara fiziksel olarak yaklaş.');
        return;
      }
      const marker = nearest.marker;
      const expectedLayer = marker.layer || 'street';
      const targetY = expectedLayer === 'rooftop' ? marker.roofY : marker.streetY;
      const distance = Math.hypot(marker.x - this.player.x, (targetY - this.player.footY) * 0.8);
      if (!this.player.onGround || this.hook.state !== 'idle' || expectedLayer !== this.world.activeLayer || distance > 92) {
        showToast(expectedLayer === this.world.activeLayer
          ? 'Çok uzaktasın. Hedefe yürüyerek/parkurla yaklaşmalısın.'
          : `Bu hedef ${expectedLayer === 'rooftop' ? 'çatıda' : 'sokak seviyesinde'}. Kanca ve parkurla doğru seviyeye ulaş.`);
        return;
      }
      if (this.onMarkerClick) this.onMarkerClick(marker);
    }

  }

  // ---------------------------------------------------------------------------
  // 7. DIALOGUE CONTROLLER: reusable for NPCs, mission beats and boss encounters.
  // ---------------------------------------------------------------------------
  class DialogueController {
    constructor(events, characterManager, questEngine) {
      this.events = events;
      this.characters = characterManager;
      this.quests = questEngine;
      this.session = null;
      this.portrait = document.querySelector('#dialogue-portrait');
      this.initials = document.querySelector('#portrait-initials');
      this.speaker = document.querySelector('#dialogue-speaker');
      this.role = document.querySelector('#dialogue-role');
      this.text = document.querySelector('#dialogue-text');
      this.counter = document.querySelector('#dialogue-counter');
      this.nextButton = document.querySelector('#dialogue-next');
      this.nextButton.addEventListener('click', () => this.next());
    }
    start(lines, completionAction = null) {
      if (!Array.isArray(lines) || lines.length === 0) {
        if (completionAction) this.quests.completeObjective(completionAction);
        return;
      }
      this.session = { lines, index: 0, completionAction };
      this.render();
    }
    setNarration(speaker, role, text) {
      this.session = null;
      this.paintLine({ speaker, role, text }, 0, 0);
      this.nextButton.disabled = true;
      this.nextButton.textContent = 'İşaretleri incele';
    }
    next() {
      if (!this.session) return;
      if (this.session.index < this.session.lines.length - 1) {
        this.session.index += 1;
        this.render();
        return;
      }
      const action = this.session.completionAction;
      this.session = null;
      this.nextButton.disabled = true;
      this.nextButton.innerHTML = 'Konuşmayı sürdür <span>→</span>';
      if (action) {
        const completed = this.quests.completeObjective(action);
        if (completed) showToast('Görev hedefi tamamlandı. Şehrin kontrol dengesi değişiyor.');
        else this.setNarration('Londra Günlüğü', 'FIELD NOTES', 'Bu noktada yeni bir görev hedefi yok. Aktif hedefin işaretini takip et.');
      } else {
        this.setNarration('Londra Günlüğü', 'FIELD NOTES', 'Sokaklar yeni sırlar saklıyor. Haritada başka bir işaret seç.');
      }
      this.events.emit('dialogue:closed', { action });
    }
    render() {
      if (!this.session) return;
      const line = this.session.lines[this.session.index];
      this.paintLine(line, this.session.index + 1, this.session.lines.length);
      this.nextButton.disabled = false;
      this.nextButton.innerHTML = this.session.index === this.session.lines.length - 1 ? 'Sahneyi tamamla <span>→</span>' : 'Konuşmayı sürdür <span>→</span>';
    }
    paintLine(line, index, total) {
      const actualSpeaker = line.speaker === 'active' ? this.characters.active.name : line.speaker;
      const actualRole = line.speaker === 'active' ? this.characters.active.role : (line.role || 'LONDON, 1868');
      this.speaker.textContent = actualSpeaker || 'Londra Günlüğü';
      this.role.textContent = actualRole;
      this.text.textContent = line.text || '';
      this.counter.textContent = total ? `DİYALOG ${String(index).padStart(2, '0')} / ${String(total).padStart(2, '0')}` : 'FIELD NOTES';
      const isActive = line.speaker === 'active';
      const isBoss = /Ironford|Rook|Huxley|Briggs/i.test(actualSpeaker || '');
      this.portrait.className = `portrait${isActive ? ` ${this.characters.active.id}` : isBoss ? ' boss' : ''}`;
      this.initials.textContent = isActive ? this.characters.active.monogram : (actualSpeaker || 'FC').split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase();
    }
  }


  // ---------------------------------------------------------------------------
  // 8. COMBAT LIBRARY: hitboxes, hurtboxes, combo windows, parry and stealth.
  // ---------------------------------------------------------------------------
  class CombatSystem {
    constructor(renderer, world, characters, eventBus) {
      this.renderer = renderer; this.world = world; this.characters = characters; this.events = eventBus;
      this.player = renderer.player;
      this.playerHealth = 100; this.playerMaxHealth = 100;
      this.playerInvulnerability = 0; this.parryWindow = 0; this.counterWindow = 0;
      this.comboIndex = 0; this.comboTimer = 0; this.attack = null; this.attackCooldown = 0;
      this.hitStop = 0; this.screenShake = 0; this.screenShakePower = 0;
      this.effects = []; this.hitTargets = new Set(); this.enemies = new Map();
      this.activeBoss = null; this.feed = []; this.lastFeedAt = 0;
      this.ui = {
        playerName: document.querySelector('#player-vitals-name'), healthLabel: document.querySelector('#player-health-label'), healthBar: document.querySelector('#player-health-bar'),
        bossVitals: document.querySelector('#boss-vitals'), bossName: document.querySelector('#boss-name'), bossPhase: document.querySelector('#boss-phase'), bossHealth: document.querySelector('#boss-health-bar'), bossStamina: document.querySelector('#boss-stamina-bar'), feed: document.querySelector('#combat-feed')
      };
      this.ensureEnemies();
      this.events.on('world:districtchange', () => { this.activeBoss = null; this.ensureEnemies(true); this.refreshUI(); });
      this.events.on('character:changed', () => this.refreshUI());
    }
    ensureEnemies(reset=false) {
      const district = this.world.activeDistrict;
      for (const person of district.people || []) {
        if (person.kind !== 'guard') continue;
        const id = person.id;
        if (reset || !this.enemies.has(id)) this.enemies.set(id, { id, source: person, districtId: district.id, name: person.name || 'Iron Cogs Muhafızı', kind: 'guard', layer: person.layer, x: person.x, footY: person.layer === 'street' ? district.baseline : person.roofY, facing: person.facing || -1, health: 46, maxHealth: 46, stamina: 100, state: 'patrol', timer: 1.4 + (person.phase % 1.7), attackCooldown: .4, stun: 0, alive: true, phase: 1, isBoss: false });
      }
      for (const marker of district.markers || []) {
        if (marker.type !== 'boss') continue;
        const id = marker.id;
        const maxHealth = /ironford/i.test(marker.label) ? 420 : 190;
        if (reset || !this.enemies.has(id)) this.enemies.set(id, { id, marker, districtId: district.id, name: marker.label, kind: 'boss', layer: marker.layer || 'street', x: marker.x, footY: marker.layer === 'rooftop' ? marker.roofY : marker.streetY, facing: -1, health: maxHealth, maxHealth, stamina: 100, state: 'patrol', timer: 1.0, attackCooldown: 1.2, stun: 0, alive: true, phase: 1, isBoss: true, enrageTimer: 0, aoeTimer: 0, guardCalled: false });
      }
    }
    get currentEnemies() { return [...this.enemies.values()].filter(e => e.districtId === this.world.activeDistrictId && e.alive); }
    actorY(enemy) {
      if (enemy.source) {
        const p = enemy.source;
        const patrol = Math.sin(this.renderer.elapsed * .65 + p.phase) * (p.patrol || 0);
        enemy.x = p.x + patrol; enemy.footY = p.layer === 'street' ? this.world.activeDistrict.baseline : p.roofY;
      }
      return enemy.footY;
    }
    triggerLight() {
      if (this.attackCooldown > 0 || this.attack || !this.player.onGround) return false;
      const character = this.characters.active;
      const maxCombo = 3;
      this.comboIndex = this.comboTimer > 0 ? (this.comboIndex % maxCombo) + 1 : 1;
      this.comboTimer = .82;
      const isEleanor = character.id === 'eleanor';
      const timing = isEleanor ? [.17,.14,.2][this.comboIndex-1] : [.21,.19,.26][this.comboIndex-1];
      this.attack = { type:'light', combo:this.comboIndex, timer:0, startup:isEleanor?.07:.11, active:timing, recovery:isEleanor?.18:.26, damage:(isEleanor?15:20) + this.comboIndex*2, range:isEleanor?63:58, height:43, hit:false };
      this.attackCooldown = .12; this.hitTargets.clear();
      this.events.emit('combat:attack', { type:'light', combo:this.comboIndex, character:character.id });
      this.addFeed(`${character.name}: ${isEleanor?'hızlı bıçak':'muşta/baston'} kombo ${this.comboIndex}`, 'attack');
      return true;
    }
    triggerHeavy() {
      if (this.attackCooldown > 0 || this.attack || !this.player.onGround) return false;
      const isEleanor = this.characters.active.id === 'eleanor';
      this.comboIndex = 0; this.comboTimer = 0;
      this.attack = { type:'heavy', combo:0, timer:0, startup:.28, active:.19, recovery:.42, damage:isEleanor?34:48, range:isEleanor?74:86, height:52, hit:false };
      this.attackCooldown = .25; this.hitTargets.clear();
      this.events.emit('combat:attack', { type:'heavy', character:this.characters.active.id });
      this.addFeed(isEleanor?'Ağır çift bıçak hamlesi':'Ağır baston darbesi', 'attack');
      return true;
    }
    triggerParry() {
      if (this.parryWindow > 0 || this.attack) return false;
      this.parryWindow = .22; this.counterWindow = 0;
      this.addFeed('Savuşturma hazır: zamanlamayı tuttur!', 'parry');
      return true;
    }
    tryStealth() {
      if (this.characters.active.id !== 'eleanor') return false;
      const player = this.player;
      const target = this.currentEnemies.filter(e => !e.isBoss && e.layer === this.world.activeLayer && Math.abs(e.x-player.x)<48 && Math.abs(this.actorY(e)-player.footY)<28 && e.alive && e.state === 'patrol')
        .find(e => (e.facing > 0 && player.x < e.x) || (e.facing < 0 && player.x > e.x));
      if (!target) return false;
      target.health = 0; target.alive = false; target.state = 'defeated';
      this.spawnBurst(target.x, target.footY-22, '#c9b17a', 12); this.hitStop=.07; this.addShake(2.5);
      this.addFeed(`Sessiz suikast: ${target.name}`, 'stealth');
      this.events.emit('combat:enemydefeated', { enemy:target, stealth:true }); this.refreshUI();
      if (target.marker && questEngine.currentObjective?.markerId === target.id) this.finishBossObjective(target);
      return true;
    }
    update(dt) {
      this.attackCooldown=Math.max(0,this.attackCooldown-dt); this.comboTimer=Math.max(0,this.comboTimer-dt); this.parryWindow=Math.max(0,this.parryWindow-dt); this.counterWindow=Math.max(0,this.counterWindow-dt); this.playerInvulnerability=Math.max(0,this.playerInvulnerability-dt); this.screenShake=Math.max(0,this.screenShake-dt);
      if (this.attack) {
        const a=this.attack; a.timer+=dt;
        const activeStart=a.startup, activeEnd=a.startup+a.active;
        if (a.timer>=activeStart && a.timer<=activeEnd) this.resolvePlayerHit(a);
        if (a.timer>=a.startup+a.active+a.recovery) this.attack=null;
      }
      for (const enemy of this.currentEnemies) this.updateEnemy(enemy,dt);
      for (const fx of this.effects) { fx.life-=dt; fx.x+=fx.vx*dt; fx.y+=fx.vy*dt; fx.vy+=fx.gravity*dt; }
      this.effects=this.effects.filter(fx=>fx.life>0);
      for(const item of this.feed) item.time-=dt;
      const feedBefore=this.feed.length; this.feed=this.feed.filter(item=>item.time>0); if(this.feed.length!==feedBefore) this.renderFeed();
      this.refreshUI();
    }
    resolvePlayerHit(attack) {
      const p=this.player, facing=p.facing||1;
      const hitbox={x:facing>0?p.x+8:p.x-attack.range-8,y:p.footY-attack.height-7,w:attack.range,h:attack.height};
      for (const enemy of this.currentEnemies) {
        if (!enemy.alive || enemy.layer!==this.world.activeLayer || this.hitTargets.has(enemy.id)) continue;
        const ex=enemy.x-11, ey=this.actorY(enemy)-52, ew=22, eh=52;
        if (hitbox.x<ex+ew && hitbox.x+hitbox.w>ex && hitbox.y<ey+eh && hitbox.y+hitbox.h>ey) {
          this.hitTargets.add(enemy.id);
          const counterBonus=this.counterWindow>0?1.65:1;
          const damage=attack.damage*(enemy.state==='stunned'?1.35:1)*counterBonus;
          if(counterBonus>1){this.counterWindow=0;this.addFeed('KARŞI SALDIRI · EKSTRA HASAR','parry');}
          enemy.health=Math.max(0,enemy.health-damage); enemy.stamina=Math.max(0,enemy.stamina-attack.damage*.8);
          enemy.state='stunned'; enemy.stun=attack.type==='heavy'?.75:.38; enemy.attackCooldown=Math.max(enemy.attackCooldown,.65); enemy.x+=facing*(attack.type==='heavy'?22:11);
          this.hitStop=attack.type==='heavy'?.065:.045; this.addShake(attack.type==='heavy'?5:2.4);
          this.spawnBurst(ex+ew/2,ey+eh/2,attack.type==='heavy'?'#d8b765':'#c7c0a9',attack.type==='heavy'?13:7);
          this.effects.push({kind:'trail',x:p.x+facing*22,y:p.footY-32,vx:0,vy:0,life:.16,maxLife:.16,angle:facing,heavy:attack.type==='heavy'});
          this.addFeed(`${enemy.name} −${Math.round(damage)} CAN`, 'hit');
          this.events.emit('combat:hit', { enemy, damage, attack:attack.type });
          if (enemy.health<=0) { enemy.alive=false; enemy.state='defeated'; this.addFeed(`${enemy.name} etkisiz hâle getirildi`, 'victory'); this.events.emit('combat:enemydefeated',{enemy,stealth:false}); if (enemy.marker) this.finishBossObjective(enemy); }
        }
      }
    }
    updateEnemy(enemy,dt) {
      this.actorY(enemy); enemy.attackCooldown=Math.max(0,enemy.attackCooldown-dt); enemy.stun=Math.max(0,enemy.stun-dt);
      if (enemy.stun>0) { enemy.state='stunned'; return; }
      if (enemy.state==='stunned') enemy.state='patrol';
      const p=this.player, sameLayer=enemy.layer===this.world.activeLayer, dx=p.x-enemy.x, dy=Math.abs(p.footY-enemy.footY), distance=Math.abs(dx);
      if (!sameLayer || dy>54 || distance>270) { enemy.state='patrol'; return; }
      enemy.facing=dx<0?-1:1;
      if (enemy.isBoss) {
        if (enemy.health<=enemy.maxHealth*.5 && enemy.phase===1) { enemy.phase=2; enemy.enrageTimer=2.2; enemy.state='enrage'; this.addFeed(`${enemy.name}: ÖFKE AŞAMASI`, 'boss'); this.addShake(7); this.spawnBurst(enemy.x,enemy.footY-30,'#a94e3d',24); }
        if (enemy.phase===2 && enemy.health<=enemy.maxHealth*.32 && !enemy.guardCalled) {
          enemy.guardCalled=true;
          const district=this.world.activeDistrict;
          for(let i=0;i<2;i++){ const person={id:`${enemy.id}-reinforcement-${i}`,x:clamp(enemy.x+(i?1:-1)*145,30,district.worldWidth-30),layer:enemy.layer,kind:'guard',name:'Iron Cogs Takviyesi',phase:i*1.8,speed:20,patrol:10,facing:i? -1:1,roofY:enemy.layer==='rooftop'?enemy.footY:undefined}; district.people.push(person); }
          this.ensureEnemies(); this.addFeed('IRON COGS TAKVİYESİ GELİYOR','warning');
        }
        if (enemy.enrageTimer>0) { enemy.enrageTimer-=dt; return; }
        enemy.aoeTimer=Math.max(0,enemy.aoeTimer-dt);
        if (enemy.phase===2 && enemy.aoeTimer<=0 && distance<220) { enemy.state='aoe-warning'; enemy.aoeTimer=3.5; enemy.attackCooldown=1.0; this.effects.push({kind:'aoe',x:p.x,y:p.footY,life:.8,maxLife:.8}); this.addFeed(`${enemy.name}: Buhar/AOE saldırısı hazırlanıyor!`, 'warning'); return; }
        if (enemy.state==='aoe-warning') { if (enemy.aoeTimer<2.7) { if (distance<105 && this.playerInvulnerability<=0) this.damagePlayer(19,enemy); enemy.state='patrol'; } return; }
      }
      if (distance<76 && enemy.attackCooldown<=0) {
        enemy.state='attack-warning'; enemy.timer=.48; enemy.attackCooldown=1.65; this.addFeed(`${enemy.name} saldırı uyarısı! I ile parry yap`, 'warning');
      } else if (distance<230 && distance>85 && enemy.attackCooldown<=0) {
        enemy.state='charging'; enemy.x+=Math.sign(dx)*Math.min(70,90*dt); enemy.attackCooldown=.8;
      }
      if (enemy.state==='attack-warning') {
        enemy.timer-=dt;
        if (enemy.timer<=0) {
          const inRange=distance<94;
          if (inRange && this.parryWindow>0) { enemy.state='stunned'; enemy.stun=1.05; this.counterWindow=1.25; this.parryWindow=0; this.spawnBurst(enemy.x,enemy.footY-30,'#e7c56e',14); this.hitStop=.055; this.addShake(3.5); this.addFeed('PARRY BAŞARILI · KARŞI SALDIRI FIRSATI!', 'parry'); }
          else if (inRange && this.playerInvulnerability<=0) this.damagePlayer(enemy.isBoss?16:9,enemy);
          enemy.state='patrol';
        }
      }
    }
    damagePlayer(amount,source) {
      this.playerHealth=Math.max(0,this.playerHealth-amount); this.playerInvulnerability=.72; this.player.vx+=(this.player.x<source.x?-1:1)*180; this.player.vy=-100; this.player.onGround=false; this.addShake(4); this.spawnBurst(this.player.x,this.player.footY-28,'#9b5145',9); this.addFeed(`DARBE ALDIN: −${amount} CAN`, 'warning'); this.events.emit('combat:playerdamaged',{amount,source,health:this.playerHealth});
      if (this.playerHealth<=0) { this.playerHealth=this.playerMaxHealth; this.player.vx=0; this.player.vy=-240; this.addFeed('YENİDEN TOPARLANDIN · SON KONTROL NOKTASI', 'warning'); }
    }
    finishBossObjective(enemy) {
      const objective=questEngine.currentObjective;
      if (objective && objective.markerId===enemy.id) {
        // Boss objectives use their existing narrative dialogue/quest completion pipeline.
        dialogue.start(objective.dialogue || [{speaker:enemy.name,role:'IRON COGS',text:'Bu şehir değişecek...'}],objective.action);
      }
    }
    spawnBurst(x,y,color,count=8) { for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,s=35+Math.random()*155;this.effects.push({kind:'particle',x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-25,gravity:280,life:.22+Math.random()*.28,maxLife:.5,color,size:1.4+Math.random()*2.6});} }
    addShake(power) { this.screenShake=Math.max(this.screenShake,.14); this.screenShakePower=Math.max(this.screenShakePower,power); }
    addFeed(message,type='info') { this.feed.unshift({message,type,time:2.8}); this.feed=this.feed.slice(0,3); this.renderFeed(); }
    renderFeed() { if (!this.ui.feed) return; this.ui.feed.innerHTML=this.feed.map(item=>`<div class="feed-item ${item.type}">${item.message}</div>`).join(''); }
    drawVfx() {
      const ctx=this.renderer.ctx;
      for(const fx of this.effects){const alpha=Math.max(0,fx.life/fx.maxLife);ctx.save();ctx.globalAlpha=alpha;
        if(fx.kind==='particle'){ctx.fillStyle=fx.color;ctx.beginPath();ctx.arc(fx.x,fx.y,fx.size*alpha,0,Math.PI*2);ctx.fill();}
        else if(fx.kind==='trail'){ctx.strokeStyle=fx.heavy?'#e4b95f':'#d4d7ca';ctx.lineWidth=fx.heavy?5:3;ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=9;ctx.beginPath();ctx.arc(fx.x,fx.y,26*(1-alpha)+18,.7,2.5);ctx.stroke();}
        else if(fx.kind==='aoe'){ctx.strokeStyle='#b85c45';ctx.lineWidth=3;ctx.setLineDash([7,5]);ctx.beginPath();ctx.arc(fx.x,fx.y,125*(1-alpha)+18,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}
        ctx.restore();}
    }
    refreshUI() {
      if(this.ui.playerName) this.ui.playerName.textContent=`${this.characters.active.name} ${this.characters.active.surname}`.toUpperCase();
      if(this.ui.healthLabel) this.ui.healthLabel.textContent=`${Math.ceil(this.playerHealth)} / ${this.playerMaxHealth}`;
      if(this.ui.healthBar) this.ui.healthBar.style.width=`${this.playerHealth/this.playerMaxHealth*100}%`;
      const boss=this.currentEnemies.filter(e=>e.isBoss && e.alive && e.layer===this.world.activeLayer && Math.abs(e.x-this.player.x)<380).sort((a,b)=>Math.abs(a.x-this.player.x)-Math.abs(b.x-this.player.x))[0];
      this.activeBoss=boss||null;
      if(this.ui.bossVitals){this.ui.bossVitals.classList.toggle('is-hidden',!boss);if(boss){this.ui.bossName.textContent=boss.name.toUpperCase();this.ui.bossPhase.textContent=boss.phase===2?'PHASE II · ENRAGED':'PHASE I · DUEL';this.ui.bossHealth.style.width=`${boss.health/boss.maxHealth*100}%`;this.ui.bossStamina.style.width=`${boss.stamina/100*100}%`;}}
    }
  }

  // ---------------------------------------------------------------------------
  // 9. PROCEDURAL ANIMATION / VFX ADAPTER: render feedback from combat state.
  // ---------------------------------------------------------------------------

  // UI adapter: updates panels from data/state; no game rules are defined here.

  const characterManager = new CharacterManager(CHARACTERS, events);
  const worldMap = new WorldMap(WORLD_DATA, events);
  const questEngine = new QuestEngine(QUESTS, worldMap, events);
  const renderer = new ParallaxRenderer(document.querySelector('#city-canvas'), worldMap, characterManager, events);
  const combat = new CombatSystem(renderer, worldMap, characterManager, events);
  renderer.combat = combat;
  const dialogue = new DialogueController(events, characterManager, questEngine);

  const ui = {
    districtTitle: document.querySelector('#district-title'),
    districtSubtitle: document.querySelector('#district-subtitle'),
    sceneLabel: document.querySelector('#scene-label'),
    matrixSummary: document.querySelector('#matrix-summary'),
    matrixTitle: document.querySelector('#matrix-title'),
    matrix: document.querySelector('#map-matrix'),
    districtRail: document.querySelector('#district-rail'),
    districtProgress: document.querySelector('#district-progress-list'),
    profile: document.querySelector('#character-profile'),
    stats: document.querySelector('#character-stats'),
    abilityTitle: document.querySelector('#ability-title'),
    abilityCopy: document.querySelector('#ability-copy'),
    questTitle: document.querySelector('#quest-title'),
    questNumber: document.querySelector('#quest-number'),
    questAct: document.querySelector('#quest-act'),
    questLocation: document.querySelector('#quest-location'),
    questDescription: document.querySelector('#quest-description'),
    questProgressLabel: document.querySelector('#quest-progress-label'),
    questProgressBar: document.querySelector('#quest-progress-bar'),
    questObjectives: document.querySelector('#quest-objectives'),
    objectiveTitle: document.querySelector('#current-objective-title'),
    objectiveCopy: document.querySelector('#current-objective-copy'),
    cityFreedom: document.querySelector('#city-freedom'),
    collectibleCount: document.querySelector('#collectible-count'),
    lettersCount: document.querySelector('#letters-count'),
    relicsCount: document.querySelector('#relics-count'),
    chestsCount: document.querySelector('#chests-count'),
    syndicateStatus: document.querySelector('#syndicate-status'),
    actLabel: document.querySelector('#act-label'),
    controlFoot: document.querySelector('#control-foot-text'),
    controlFootWrap: document.querySelector('.control-foot'),
    intelTitle: document.querySelector('#intel-title'),
    intelCopy: document.querySelector('#intel-copy')
  };

  function showToast(message) {
    const toast = document.querySelector('#toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  function renderDistrictRail() {
    ui.districtRail.innerHTML = '';
    Object.values(WORLD_DATA.districts).forEach(district => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `district-card${district.id === worldMap.activeDistrictId ? ' is-active' : ''}`;
      button.dataset.district = district.id;
      const progress = worldMap.liberation[district.id];
      button.innerHTML = `<span class="district-index">DISTRICT ${district.index}</span><strong>${district.name}</strong><span class="district-boss">BOSS · ${district.boss}</span><div class="mini-progress"><i style="width:${progress}%"></i></div><span class="progress-caption"><span>${progress >= 100 ? 'ÖZGÜRLEŞTİRİLDİ' : 'ÖZGÜRLÜK'}</span><span>${Math.round(progress)}%</span></span>`;
      button.addEventListener('click', () => {
        worldMap.selectDistrict(district.id);
        showToast(`${district.name}: ${district.description}`);
      });
      ui.districtRail.appendChild(button);
    });
  }

  function renderMatrix() {
    const district = worldMap.activeDistrict;
    const layer = worldMap.activeLayer;
    const sector = Math.floor(renderer.cameraX / WORLD_SEGMENT_WIDTH) + 1;
    ui.matrixSummary.textContent = `14 × 8 GRID · SECTOR ${sector}/${WORLD_SEGMENT_COUNT} · ${layer === 'street' ? 'STREET' : 'ROOFTOP'}`;
    ui.matrixTitle.textContent = `${district.name.toUpperCase()} / ${layer === 'street' ? 'STREET' : 'ROOFTOP'} GRID`;
    const glyphMap = { R: 'road', B: 'building', A: 'anchor', L: 'landmark', G: 'gang', W: 'water', C: 'collectible', '.': 'empty' };
    ui.matrix.innerHTML = '';
    worldMap.getGrid().forEach((row, rowIndex) => row.forEach((glyph, colIndex) => {
      const cell = document.createElement('div');
      const cellType = glyphMap[glyph] || 'empty';
      cell.className = `map-cell ${cellType}`;
      cell.title = `${district.name} · ${layer} · row ${rowIndex + 1}, col ${colIndex + 1} · ${glyph}`;
      cell.setAttribute('aria-label', cell.title);
      ui.matrix.appendChild(cell);
    }));
  }

  function renderRegionInfo() {
    const district = worldMap.activeDistrict;
    ui.districtTitle.textContent = district.name.toUpperCase();
    ui.districtSubtitle.textContent = district.subtitle;
    ui.sceneLabel.textContent = `${district.name.toUpperCase()} · ${worldMap.activeLayer === 'street' ? 'STREET LEVEL' : 'ROOFTOP ROUTE'}`;
    ui.intelTitle.textContent = district.landmarkSummary.split(' · ')[0];
    ui.intelCopy.textContent = district.description;
    document.querySelectorAll('[data-layer]').forEach(button => button.classList.toggle('is-active', button.dataset.layer === worldMap.activeLayer));
    document.querySelectorAll('[data-character]').forEach(button => button.classList.toggle('is-active', button.dataset.character === characterManager.activeId));
    document.querySelector('#map-coordinates').textContent = `GRID ${String(Math.floor(district.index) + 3).padStart(2, '0')} · ${worldMap.activeLayer === 'street' ? '04' : '02'}`;
    renderMatrix();
    renderDistrictRail();
  }

  function renderCharacter() {
    const character = characterManager.active;
    ui.profile.innerHTML = `<div class="character-portrait ${character.id}"><span class="portrait-badge">LONDON · 1868</span></div><div class="profile-copy"><p class="name-line">${character.name} ${character.surname}</p><div class="role-line">${character.role}</div><p>${character.description}</p><p style="margin-top:6px;color:#cdb77d;font-size:9px">SİLAH: ${character.weapon}</p></div>`;
    const labels = { health: 'DAYANIKLILIK', combat: 'DÖVÜŞ', stealth: 'GİZLİLİK', agility: 'ÇEVİKLİK', hookRange: 'KANCA MENZİLİ' };
    ui.stats.innerHTML = Object.entries(character.stats).map(([key, value]) => `<div class="stat-row"><div class="stat-label"><span>${labels[key]}</span><strong>${key === 'hookRange' ? `${character.hookRange} m` : value}</strong></div><div class="stat-track"><i style="width:${value}%"></i></div></div>`).join('');
    ui.abilityTitle.textContent = character.abilityTitle;
    ui.abilityCopy.textContent = character.ability;
    if (!dialogue.session) {
      const objective = questEngine.currentObjective;
      dialogue.setNarration('Londra Günlüğü', 'FIELD NOTES', `${character.name} aktif. ${objective ? objective.description : 'Ana hikâye tamamlandı.'}`);
    } else {
      dialogue.render();
    }
  }

  function renderQuest() {
    const quest = questEngine.currentQuest;
    const progress = questEngine.overallProgress;
    ui.questProgressLabel.textContent = percent(progress);
    ui.questProgressBar.style.width = `${progress}%`;
    ui.actLabel.textContent = quest ? `${quest.act} · ${quest.actTitle}` : 'EPILOGUE · A FREE LONDON';
    if (!quest) {
      ui.questTitle.textContent = 'Londra Özgür';
      ui.questNumber.textContent = '04 / 04';
      ui.questAct.textContent = 'EPILOGUE';
      ui.questLocation.textContent = 'LONDON';
      ui.questDescription.textContent = 'Ironford’un düzeni çöktü. Dört bölge de özgür ve Yeraltı Sendikası artık şehrin geleceğini koruyor.';
      ui.questObjectives.innerHTML = '<div class="objective-row is-done"><span class="objective-icon">✓</span><strong>Ana hikâyenin tüm hedefleri tamamlandı</strong><small>DONE</small></div>';
      ui.objectiveTitle.textContent = 'Ana hikâye tamamlandı';
      ui.objectiveCopy.textContent = 'Şehri keşfetmeye devam et; toplanabilir eşyalar hâlâ sahnede.';
      return;
    }
    const objective = questEngine.currentObjective;
    ui.questTitle.textContent = quest.title;
    ui.questNumber.textContent = `${String(questEngine.questIndex + 1).padStart(2, '0')} / ${String(QUESTS.length).padStart(2, '0')}`;
    ui.questAct.textContent = quest.act;
    ui.questLocation.textContent = WORLD_DATA.districts[objective?.district || quest.district].name.toUpperCase();
    ui.questDescription.textContent = quest.description;
    ui.questObjectives.innerHTML = quest.objectives.map((item, index) => {
      const done = questEngine.isObjectiveDone(item.id);
      const current = item.id === objective?.id;
      const status = done ? 'TAMAMLANDI' : current ? 'AKTİF HEDEF' : 'BEKLEMEDE';
      return `<div class="objective-row${done ? ' is-done' : current ? ' is-current' : ''}"><span class="objective-icon">${done ? '✓' : current ? '◆' : String(index + 1).padStart(2, '0')}</span><strong>${item.title}</strong><small>${status}</small></div>`;
    }).join('');
    ui.objectiveTitle.textContent = objective?.title || 'Görev tamamlandı';
    ui.objectiveCopy.textContent = objective?.description || 'Yeni hedef bekleniyor.';
  }

  function renderDistrictProgress() {
    ui.districtProgress.innerHTML = '';
    Object.values(WORLD_DATA.districts).forEach(district => {
      const value = worldMap.liberation[district.id];
      const row = document.createElement('div');
      row.className = 'control-row';
      row.innerHTML = `<span>${district.name}</span><div class="control-track"><i style="width:${value}%"></i></div><strong>${Math.round(value)}%</strong>`;
      ui.districtProgress.appendChild(row);
    });
    const counts = worldMap.getInventoryCounts();
    ui.collectibleCount.textContent = `${String(counts.total).padStart(2, '0')} / ${String(counts.max).padStart(2, '0')}`;
    ui.lettersCount.textContent = String(counts.letter).padStart(2, '0');
    ui.relicsCount.textContent = String(counts.relic).padStart(2, '0');
    ui.chestsCount.textContent = String(counts.chest).padStart(2, '0');
    ui.cityFreedom.textContent = `${Math.round(worldMap.getCityFreedom())}% ÖZGÜR`;
    const freedCount = Object.values(worldMap.liberation).filter(value => value >= 100).length;
    ui.syndicateStatus.textContent = freedCount === 4 ? 'LONDRA ÖZGÜR' : freedCount > 0 ? `${freedCount} BÖLGE KURTARILDI` : 'HÜCRE KURULUYOR';
    ui.controlFoot.textContent = freedCount === 4 ? 'Iron Cogs’un kontrolü sona erdi.' : `${4 - freedCount} bölge hâlâ Iron Cogs kontrolünde.`;
    ui.controlFootWrap.classList.toggle('is-free', freedCount === 4);
  }

  function renderAll() {
    renderRegionInfo();
    renderCharacter();
    renderQuest();
    renderDistrictProgress();
    renderer.renderImmediate();
  }

  // ---------------------------------------------------------------------------
  // 9. INTERACTION ROUTER: map nodes activate dialogs, collectibles or objectives.
  // ---------------------------------------------------------------------------
  function handleMarkerClick(marker) {
    const objective = questEngine.currentObjective;
    const reservedForQuest = QUEST_MARKER_IDS.has(marker.id);

    if (marker.type === 'collectible' && worldMap.isCollected(marker.id)) {
      showToast(`${marker.label} zaten envanterinde.`);
      return;
    }
    if (reservedForQuest && (!objective || objective.markerId !== marker.id)) {
      showToast('Bu görev noktası henüz etkin değil. Sağdaki aktif hedefi takip et.');
      return;
    }
    if (marker.type === 'landmark' && !marker.action) {
      ui.intelTitle.textContent = marker.label;
      ui.intelCopy.textContent = marker.description || 'Tarihî kayıtlar incelendi.';
      dialogue.setNarration(marker.label, 'HISTORICAL LANDMARK', marker.description || 'Bu yapı Londra’nın hikâyesinin bir parçası.');
      showToast(`${marker.label} hakkında bilgi günlüğe eklendi.`);
      return;
    }
    if (marker.type === 'collectible') {
      if (worldMap.collect(marker)) {
        showToast(`${marker.label} envantere eklendi.`);
        if (objective && objective.markerId === marker.id && objective.action === marker.action) {
          const completed = questEngine.completeObjective(objective.action);
          if (completed) showToast(`Koleksiyon bulundu: ${marker.label}. Görev ilerledi.`);
        }
        renderAll();
      }
      return;
    }
    if (objective && objective.markerId === marker.id && marker.action === objective.action) {
      const lines = objective.dialogue || marker.dialogue || [
        { speaker: marker.speaker || marker.label, role: marker.role || 'IRON COGS', text: `${marker.label}. Bu karşılaşma, Londra’nın kontrolü için verilen mücadelenin bir parçası.` },
        { speaker: 'active', role: characterManager.active.role, text: 'Bu sokaklar artık korkuyla yönetilmeyecek.' }
      ];
      dialogue.start(lines, objective.action);
      return;
    }
    if (marker.type === 'collectible') return;
    dialogue.setNarration(marker.label, marker.role || 'FIELD NOTES', marker.description || `${marker.label}: bu nokta haritada işaretlendi. Aktif görev hedefiyle eşleştiğinde etkileşime açılacak.`);
    showToast(`${marker.label} seçildi.`);
  }

  renderer.onMarkerClick = handleMarkerClick;

  // ---------------------------------------------------------------------------
  // 10. INPUT BINDINGS: mouse/touch-friendly UI and Q character switching.
  // ---------------------------------------------------------------------------
  document.querySelectorAll('[data-character]').forEach(button => {
    button.addEventListener('click', () => {
      if (characterManager.switchTo(button.dataset.character)) {
        renderAll();
        showToast(`${characterManager.active.name} sahada. ${characterManager.active.abilityTitle}: ${characterManager.active.ability}`);
      }
    });
  });
  document.querySelectorAll('[data-layer]').forEach(button => {
    button.addEventListener('click', () => {
      const requestedLayer = button.dataset.layer;
      if (requestedLayer === worldMap.activeLayer) {
        showToast(requestedLayer === 'street' ? 'Sokak seviyesindesin. Çatıya çıkmak için G ile kanca at, F ile çekil.' : 'Çatıdasın. Sokak seviyesine dönmek için çatı kenarından aşağı atla.');
        return;
      }
      if (requestedLayer === 'rooftop') {
        renderer.launchHook(false);
      } else {
        renderer.releaseHook();
        showToast('Katman değişimi artık ışınlanma değil. Çatıdan sokağa güvenli bir iniş yolu bul.');
      }
    });
  });
  window.addEventListener('keydown', event => {
    const target = event.target;
    if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
    if (event.code === 'KeyQ' && !event.repeat) {
      if (characterManager.toggle()) {
        renderCharacter();
        renderer.renderImmediate();
        showToast(`Karakter değiştirildi: ${characterManager.active.name}.`);
      }
    }
    if (event.code === 'KeyE' && !event.repeat) { if (!combat.tryStealth()) renderer.interactNearest(); }
    if (event.code === 'KeyJ' && !event.repeat) combat.triggerLight();
    if (event.code === 'KeyK' && !event.repeat) combat.triggerHeavy();
    if (event.code === 'KeyI' && !event.repeat) combat.triggerParry();
    if (event.code === 'Digit1') worldMap.selectDistrict('whitechapel');
    if (event.code === 'Digit2') worldMap.selectDistrict('westminster');
    if (event.code === 'Digit3') worldMap.selectDistrict('docks');
    if (event.code === 'Digit4') worldMap.selectDistrict('industrial');
  });

  events.on('world:districtchange', renderRegionInfo);
  events.on('world:layerchange', renderRegionInfo);
  events.on('character:changed', () => { renderCharacter(); renderQuest(); });
  events.on('world:collectible', renderDistrictProgress);
  events.on('district:progress', () => { renderDistrictRail(); renderDistrictProgress(); });
  events.on('quest:objectivecompleted', () => { renderQuest(); renderDistrictProgress(); });
  events.on('quest:completed', ({ quest }) => showToast(`BÖLÜM TAMAMLANDI: ${quest.title}`));
  events.on('quest:changed', payload => {
    renderQuest(); renderDistrictRail(); renderRegionInfo(); renderDistrictProgress(); renderer.renderImmediate();
    if (payload.isComplete) {
      dialogue.setNarration('Ada Mercer', 'EPILOGUE · LONDON, 1868', 'Saat çaldı. Londra artık tek bir adamın malı değil. Bu, son değil; özgür bir şehrin ilk sabahı.');
      showToast('ANA HİKÂYE TAMAMLANDI · LONDRA ÖZGÜR');
    }
  });

  // Hold-to-move touch controls; pointer events work for touch, pen and mouse.
  document.querySelectorAll('[data-move]').forEach(button => {
    const action = button.dataset.move;
    const release = event => {
      if (event) event.preventDefault();
      renderer.setTouchInput(action, false);
      button.classList.remove('is-pressed');
    };
    button.addEventListener('pointerdown', event => {
      event.preventDefault();
      button.setPointerCapture?.(event.pointerId);
      renderer.setTouchInput(action, true);
      button.classList.add('is-pressed');
    });
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
  });
  document.querySelectorAll('[data-game-action]').forEach(button => {
    button.addEventListener('click', () => {
      const action=button.dataset.gameAction;
      if(action==='light') combat.triggerLight(); else if(action==='heavy') combat.triggerHeavy(); else if(action==='parry') combat.triggerParry(); else renderer.setTouchInput(action, true);
    });
  });
  // Pull is a hold action. Pointer capture keeps it reliable if the finger drifts.
  document.querySelectorAll('[data-hold-action]').forEach(button => {
    const action = button.dataset.holdAction;
    const release = event => {
      if (event) event.preventDefault();
      renderer.setTouchInput(action, false);
      button.classList.remove('is-pressed');
    };
    button.addEventListener('pointerdown', event => {
      event.preventDefault();
      button.setPointerCapture?.(event.pointerId);
      renderer.setTouchInput(action, true);
      button.classList.add('is-pressed');
    });
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
  });

  // ---------------------------------------------------------------------------
  // 11. BOOTSTRAP / DEVELOPMENT CONTRACTS.
  // ---------------------------------------------------------------------------
  renderAll();
  dialogue.setNarration('Londra Günlüğü', 'FIELD NOTES · 1868', 'Londra, 1868. A/D hareket; SHIFT koş; SPACE zıpla; G/sağ tık kanca; F çek; X bırak. J hafif kombo, K ağır saldırı, I parry. Eleanor ile düşmanın arkasına sessizce yaklaş ve E ile suikast yap. Boss saldırı uyarılarını takip et.');
  renderer.start();

  // Debug data is available from DevTools without making it part of the UI API.
  window.FreedomCall = Object.freeze({
    data: Object.freeze({ characters: CHARACTERS, world: WORLD_DATA, quests: QUESTS }),
    state: Object.freeze({ characters: characterManager, world: worldMap, quests: questEngine, renderer, combat, events })
  });
})();
