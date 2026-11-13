// Goals use existing per-account progress so older saves can earn them retroactively.
(() => {
  const items = [
  {
    "id": "v4_score_75",
    "metric": "score",
    "goal": 75,
    "text": {
      "EN": [
        "HIGH FLYER · 75",
        "Score 75 in one solo run"
      ],
      "RU": [
        "ВЫСОКИЙ ПОЛЁТ · 75",
        "Набери 75 очков за соло-забег"
      ],
      "ZH": [
        "高飞者 · 75",
        "单次单人飞行获得75分"
      ],
      "ES": [
        "GRAN VUELO · 75",
        "Logra 75 puntos en una partida individual"
      ],
      "PT": [
        "VOO ALTO · 75",
        "Faça 75 pontos numa partida solo"
      ]
    }
  },
  {
    "id": "v4_score_100",
    "metric": "score",
    "goal": 100,
    "text": {
      "EN": [
        "HIGH FLYER · 100",
        "Score 100 in one solo run"
      ],
      "RU": [
        "ВЫСОКИЙ ПОЛЁТ · 100",
        "Набери 100 очков за соло-забег"
      ],
      "ZH": [
        "高飞者 · 100",
        "单次单人飞行获得100分"
      ],
      "ES": [
        "GRAN VUELO · 100",
        "Logra 100 puntos en una partida individual"
      ],
      "PT": [
        "VOO ALTO · 100",
        "Faça 100 pontos numa partida solo"
      ]
    }
  },
  {
    "id": "v4_score_150",
    "metric": "score",
    "goal": 150,
    "text": {
      "EN": [
        "HIGH FLYER · 150",
        "Score 150 in one solo run"
      ],
      "RU": [
        "ВЫСОКИЙ ПОЛЁТ · 150",
        "Набери 150 очков за соло-забег"
      ],
      "ZH": [
        "高飞者 · 150",
        "单次单人飞行获得150分"
      ],
      "ES": [
        "GRAN VUELO · 150",
        "Logra 150 puntos en una partida individual"
      ],
      "PT": [
        "VOO ALTO · 150",
        "Faça 150 pontos numa partida solo"
      ]
    }
  },
  {
    "id": "v4_score_200",
    "metric": "score",
    "goal": 200,
    "text": {
      "EN": [
        "HIGH FLYER · 200",
        "Score 200 in one solo run"
      ],
      "RU": [
        "ВЫСОКИЙ ПОЛЁТ · 200",
        "Набери 200 очков за соло-забег"
      ],
      "ZH": [
        "高飞者 · 200",
        "单次单人飞行获得200分"
      ],
      "ES": [
        "GRAN VUELO · 200",
        "Logra 200 puntos en una partida individual"
      ],
      "PT": [
        "VOO ALTO · 200",
        "Faça 200 pontos numa partida solo"
      ]
    }
  },
  {
    "id": "v4_score_300",
    "metric": "score",
    "goal": 300,
    "text": {
      "EN": [
        "HIGH FLYER · 300",
        "Score 300 in one solo run"
      ],
      "RU": [
        "ВЫСОКИЙ ПОЛЁТ · 300",
        "Набери 300 очков за соло-забег"
      ],
      "ZH": [
        "高飞者 · 300",
        "单次单人飞行获得300分"
      ],
      "ES": [
        "GRAN VUELO · 300",
        "Logra 300 puntos en una partida individual"
      ],
      "PT": [
        "VOO ALTO · 300",
        "Faça 300 pontos numa partida solo"
      ]
    }
  },
  {
    "id": "v4_games_100",
    "metric": "games",
    "goal": 100,
    "text": {
      "EN": [
        "VETERAN · 100",
        "Finish 100 solo games"
      ],
      "RU": [
        "ВЕТЕРАН · 100",
        "Заверши 100 одиночных игр"
      ],
      "ZH": [
        "老将 · 100",
        "完成100局单人游戏"
      ],
      "ES": [
        "VETERANO · 100",
        "Termina 100 partidas individuales"
      ],
      "PT": [
        "VETERANO · 100",
        "Termine 100 partidas solo"
      ]
    }
  },
  {
    "id": "v4_games_250",
    "metric": "games",
    "goal": 250,
    "text": {
      "EN": [
        "VETERAN · 250",
        "Finish 250 solo games"
      ],
      "RU": [
        "ВЕТЕРАН · 250",
        "Заверши 250 одиночных игр"
      ],
      "ZH": [
        "老将 · 250",
        "完成250局单人游戏"
      ],
      "ES": [
        "VETERANO · 250",
        "Termina 250 partidas individuales"
      ],
      "PT": [
        "VETERANO · 250",
        "Termine 250 partidas solo"
      ]
    }
  },
  {
    "id": "v4_games_1000",
    "metric": "games",
    "goal": 1000,
    "text": {
      "EN": [
        "VETERAN · 1000",
        "Finish 1000 solo games"
      ],
      "RU": [
        "ВЕТЕРАН · 1000",
        "Заверши 1000 одиночных игр"
      ],
      "ZH": [
        "老将 · 1000",
        "完成1000局单人游戏"
      ],
      "ES": [
        "VETERANO · 1000",
        "Termina 1000 partidas individuales"
      ],
      "PT": [
        "VETERANO · 1000",
        "Termine 1000 partidas solo"
      ]
    }
  },
  {
    "id": "v4_flaps_5000",
    "metric": "flaps",
    "goal": 5000,
    "text": {
      "EN": [
        "WING POWER · 5000",
        "Flap 5000 times in solo"
      ],
      "RU": [
        "СИЛА КРЫЛЬЕВ · 5000",
        "Сделай 5000 взмахов в соло"
      ],
      "ZH": [
        "翅膀力量 · 5000",
        "在单人模式振翅5000次"
      ],
      "ES": [
        "ALAS FUERTES · 5000",
        "Aletea 5000 veces en modo individual"
      ],
      "PT": [
        "ASAS FORTES · 5000",
        "Bata as asas 5000 vezes no solo"
      ]
    }
  },
  {
    "id": "v4_flaps_15000",
    "metric": "flaps",
    "goal": 15000,
    "text": {
      "EN": [
        "WING POWER · 15000",
        "Flap 15000 times in solo"
      ],
      "RU": [
        "СИЛА КРЫЛЬЕВ · 15000",
        "Сделай 15000 взмахов в соло"
      ],
      "ZH": [
        "翅膀力量 · 15000",
        "在单人模式振翅15000次"
      ],
      "ES": [
        "ALAS FUERTES · 15000",
        "Aletea 15000 veces en modo individual"
      ],
      "PT": [
        "ASAS FORTES · 15000",
        "Bata as asas 15000 vezes no solo"
      ]
    }
  },
  {
    "id": "v4_flaps_50000",
    "metric": "flaps",
    "goal": 50000,
    "text": {
      "EN": [
        "WING POWER · 50000",
        "Flap 50000 times in solo"
      ],
      "RU": [
        "СИЛА КРЫЛЬЕВ · 50000",
        "Сделай 50000 взмахов в соло"
      ],
      "ZH": [
        "翅膀力量 · 50000",
        "在单人模式振翅50000次"
      ],
      "ES": [
        "ALAS FUERTES · 50000",
        "Aletea 50000 veces en modo individual"
      ],
      "PT": [
        "ASAS FORTES · 50000",
        "Bata as asas 50000 vezes no solo"
      ]
    }
  },
  {
    "id": "v4_pipes_500",
    "metric": "pipes",
    "goal": 500,
    "text": {
      "EN": [
        "PATHFINDER · 500",
        "Pass 500 pipes in solo"
      ],
      "RU": [
        "ПЕРВОПРОХОДЕЦ · 500",
        "Пройди 500 труб в соло"
      ],
      "ZH": [
        "开拓者 · 500",
        "在单人模式通过500根管道"
      ],
      "ES": [
        "EXPLORADOR · 500",
        "Supera 500 tuberías en modo individual"
      ],
      "PT": [
        "EXPLORADOR · 500",
        "Passe por 500 canos no solo"
      ]
    }
  },
  {
    "id": "v4_pipes_2500",
    "metric": "pipes",
    "goal": 2500,
    "text": {
      "EN": [
        "PATHFINDER · 2500",
        "Pass 2500 pipes in solo"
      ],
      "RU": [
        "ПЕРВОПРОХОДЕЦ · 2500",
        "Пройди 2500 труб в соло"
      ],
      "ZH": [
        "开拓者 · 2500",
        "在单人模式通过2500根管道"
      ],
      "ES": [
        "EXPLORADOR · 2500",
        "Supera 2500 tuberías en modo individual"
      ],
      "PT": [
        "EXPLORADOR · 2500",
        "Passe por 2500 canos no solo"
      ]
    }
  },
  {
    "id": "v4_pipes_10000",
    "metric": "pipes",
    "goal": 10000,
    "text": {
      "EN": [
        "PATHFINDER · 10000",
        "Pass 10000 pipes in solo"
      ],
      "RU": [
        "ПЕРВОПРОХОДЕЦ · 10000",
        "Пройди 10000 труб в соло"
      ],
      "ZH": [
        "开拓者 · 10000",
        "在单人模式通过10000根管道"
      ],
      "ES": [
        "EXPLORADOR · 10000",
        "Supera 10000 tuberías en modo individual"
      ],
      "PT": [
        "EXPLORADOR · 10000",
        "Passe por 10000 canos no solo"
      ]
    }
  },
  {
    "id": "v4_earnedcoins_500",
    "metric": "earnedCoins",
    "goal": 500,
    "text": {
      "EN": [
        "TREASURE HUNTER · 500",
        "Earn 500 coins in solo"
      ],
      "RU": [
        "ИСКАТЕЛЬ СОКРОВИЩ · 500",
        "Заработай 500 монет в соло"
      ],
      "ZH": [
        "寻宝者 · 500",
        "在单人模式赚取500枚金币"
      ],
      "ES": [
        "CAZATESOROS · 500",
        "Gana 500 monedas en modo individual"
      ],
      "PT": [
        "CAÇA-TESOUROS · 500",
        "Ganhe 500 moedas no solo"
      ]
    }
  },
  {
    "id": "v4_earnedcoins_2000",
    "metric": "earnedCoins",
    "goal": 2000,
    "text": {
      "EN": [
        "TREASURE HUNTER · 2000",
        "Earn 2000 coins in solo"
      ],
      "RU": [
        "ИСКАТЕЛЬ СОКРОВИЩ · 2000",
        "Заработай 2000 монет в соло"
      ],
      "ZH": [
        "寻宝者 · 2000",
        "在单人模式赚取2000枚金币"
      ],
      "ES": [
        "CAZATESOROS · 2000",
        "Gana 2000 monedas en modo individual"
      ],
      "PT": [
        "CAÇA-TESOUROS · 2000",
        "Ganhe 2000 moedas no solo"
      ]
    }
  },
  {
    "id": "v4_earnedcoins_10000",
    "metric": "earnedCoins",
    "goal": 10000,
    "text": {
      "EN": [
        "TREASURE HUNTER · 10000",
        "Earn 10000 coins in solo"
      ],
      "RU": [
        "ИСКАТЕЛЬ СОКРОВИЩ · 10000",
        "Заработай 10000 монет в соло"
      ],
      "ZH": [
        "寻宝者 · 10000",
        "在单人模式赚取10000枚金币"
      ],
      "ES": [
        "CAZATESOROS · 10000",
        "Gana 10000 monedas en modo individual"
      ],
      "PT": [
        "CAÇA-TESOUROS · 10000",
        "Ganhe 10000 moedas no solo"
      ]
    }
  },
  {
    "id": "v4_easy_100",
    "metric": "EASY",
    "goal": 100,
    "text": {
      "EN": [
        "EASY ACE · 100",
        "Score 100 on Easy"
      ],
      "RU": [
        "ЛЁГКИЙ АС · 100",
        "Набери 100 на лёгком уровне"
      ],
      "ZH": [
        "简单王牌 · 100",
        "在简单难度获得100分"
      ],
      "ES": [
        "AS FÁCIL · 100",
        "Logra 100 puntos en Fácil"
      ],
      "PT": [
        "ÁS FÁCIL · 100",
        "Faça 100 pontos no Fácil"
      ]
    }
  },
  {
    "id": "v4_normal_75",
    "metric": "NORMAL",
    "goal": 75,
    "text": {
      "EN": [
        "STEADY PILOT · 75",
        "Score 75 on Normal"
      ],
      "RU": [
        "УВЕРЕННЫЙ ПИЛОТ · 75",
        "Набери 75 на обычном уровне"
      ],
      "ZH": [
        "稳定飞行员 · 75",
        "在普通难度获得75分"
      ],
      "ES": [
        "PILOTO FIRME · 75",
        "Logra 75 puntos en Normal"
      ],
      "PT": [
        "PILOTO FIRME · 75",
        "Faça 75 pontos no Normal"
      ]
    }
  },
  {
    "id": "v4_hard_50",
    "metric": "HARD",
    "goal": 50,
    "text": {
      "EN": [
        "HARDENED · 50",
        "Score 50 on Hard"
      ],
      "RU": [
        "ЗАКАЛЁННЫЙ · 50",
        "Набери 50 на сложном уровне"
      ],
      "ZH": [
        "久经考验 · 50",
        "在困难难度获得50分"
      ],
      "ES": [
        "CURTIDO · 50",
        "Logra 50 puntos en Difícil"
      ],
      "PT": [
        "EXPERIENTE · 50",
        "Faça 50 pontos no Difícil"
      ]
    }
  },
  {
    "id": "v4_extreme_30",
    "metric": "EXTREME",
    "goal": 30,
    "text": {
      "EN": [
        "LIMIT BREAKER · 30",
        "Score 30 on Extreme"
      ],
      "RU": [
        "ЗА ПРЕДЕЛОМ · 30",
        "Набери 30 на экстриме"
      ],
      "ZH": [
        "突破极限 · 30",
        "在极限难度获得30分"
      ],
      "ES": [
        "SIN LÍMITES · 30",
        "Logra 30 puntos en Extremo"
      ],
      "PT": [
        "SEM LIMITES · 30",
        "Faça 30 pontos no Extremo"
      ]
    }
  },
  {
    "id": "v4_owned_5",
    "metric": "owned",
    "goal": 5,
    "text": {
      "EN": [
        "AVIARY · 5",
        "Own 5 shop bird skins"
      ],
      "RU": [
        "ПТИЧЬЯ КОЛЛЕКЦИЯ · 5",
        "Получи 5 скинов из магазина"
      ],
      "ZH": [
        "鸟类收藏 · 5",
        "拥有5款商店外观"
      ],
      "ES": [
        "AVIARIO · 5",
        "Consigue 5 aspectos de la tienda"
      ],
      "PT": [
        "AVIÁRIO · 5",
        "Tenha 5 visuais da loja"
      ]
    }
  },
  {
    "id": "v4_owned_15",
    "metric": "owned",
    "goal": 15,
    "text": {
      "EN": [
        "AVIARY · 15",
        "Own 15 shop bird skins"
      ],
      "RU": [
        "ПТИЧЬЯ КОЛЛЕКЦИЯ · 15",
        "Получи 15 скинов из магазина"
      ],
      "ZH": [
        "鸟类收藏 · 15",
        "拥有15款商店外观"
      ],
      "ES": [
        "AVIARIO · 15",
        "Consigue 15 aspectos de la tienda"
      ],
      "PT": [
        "AVIÁRIO · 15",
        "Tenha 15 visuais da loja"
      ]
    }
  },
  {
    "id": "v4_owned_26",
    "metric": "owned",
    "goal": 26,
    "text": {
      "EN": [
        "AVIARY · 26",
        "Own 26 shop bird skins"
      ],
      "RU": [
        "ПТИЧЬЯ КОЛЛЕКЦИЯ · 26",
        "Получи 26 скинов из магазина"
      ],
      "ZH": [
        "鸟类收藏 · 26",
        "拥有26款商店外观"
      ],
      "ES": [
        "AVIARIO · 26",
        "Consigue 26 aspectos de la tienda"
      ],
      "PT": [
        "AVIÁRIO · 26",
        "Tenha 26 visuais da loja"
      ]
    }
  },
  {
    "id": "v4_maps_3",
    "metric": "maps",
    "goal": 3,
    "text": {
      "EN": [
        "WORLD ATLAS · 3",
        "Own 3 shop maps"
      ],
      "RU": [
        "АТЛАС МИРОВ · 3",
        "Получи 3 карт из магазина"
      ],
      "ZH": [
        "世界图鉴 · 3",
        "拥有3张商店地图"
      ],
      "ES": [
        "ATLAS MUNDIAL · 3",
        "Consigue 3 mapas de la tienda"
      ],
      "PT": [
        "ATLAS MUNDIAL · 3",
        "Tenha 3 mapas da loja"
      ]
    }
  },
  {
    "id": "v4_maps_10",
    "metric": "maps",
    "goal": 10,
    "text": {
      "EN": [
        "WORLD ATLAS · 10",
        "Own 10 shop maps"
      ],
      "RU": [
        "АТЛАС МИРОВ · 10",
        "Получи 10 карт из магазина"
      ],
      "ZH": [
        "世界图鉴 · 10",
        "拥有10张商店地图"
      ],
      "ES": [
        "ATLAS MUNDIAL · 10",
        "Consigue 10 mapas de la tienda"
      ],
      "PT": [
        "ATLAS MUNDIAL · 10",
        "Tenha 10 mapas da loja"
      ]
    }
  },
  {
    "id": "v4_maps_18",
    "metric": "maps",
    "goal": 18,
    "text": {
      "EN": [
        "WORLD ATLAS · 18",
        "Own 18 shop maps"
      ],
      "RU": [
        "АТЛАС МИРОВ · 18",
        "Получи 18 карт из магазина"
      ],
      "ZH": [
        "世界图鉴 · 18",
        "拥有18张商店地图"
      ],
      "ES": [
        "ATLAS MUNDIAL · 18",
        "Consigue 18 mapas de la tienda"
      ],
      "PT": [
        "ATLAS MUNDIAL · 18",
        "Tenha 18 mapas da loja"
      ]
    }
  },
  {
    "id": "v4_trails_3",
    "metric": "trails",
    "goal": 3,
    "text": {
      "EN": [
        "TRAIL COLLECTION · 3",
        "Own 3 trails"
      ],
      "RU": [
        "КОЛЛЕКЦИЯ СЛЕДОВ · 3",
        "Получи 3 следов"
      ],
      "ZH": [
        "尾迹收藏 · 3",
        "拥有3种尾迹"
      ],
      "ES": [
        "COLECCIÓN DE ESTELAS · 3",
        "Consigue 3 estelas"
      ],
      "PT": [
        "COLEÇÃO DE RASTROS · 3",
        "Tenha 3 rastros"
      ]
    }
  },
  {
    "id": "v4_trails_12",
    "metric": "trails",
    "goal": 12,
    "text": {
      "EN": [
        "TRAIL COLLECTION · 12",
        "Own 12 trails"
      ],
      "RU": [
        "КОЛЛЕКЦИЯ СЛЕДОВ · 12",
        "Получи 12 следов"
      ],
      "ZH": [
        "尾迹收藏 · 12",
        "拥有12种尾迹"
      ],
      "ES": [
        "COLECCIÓN DE ESTELAS · 12",
        "Consigue 12 estelas"
      ],
      "PT": [
        "COLEÇÃO DE RASTROS · 12",
        "Tenha 12 rastros"
      ]
    }
  },
  {
    "id": "v4_trails_25",
    "metric": "trails",
    "goal": 25,
    "text": {
      "EN": [
        "TRAIL COLLECTION · 25",
        "Own 25 trails"
      ],
      "RU": [
        "КОЛЛЕКЦИЯ СЛЕДОВ · 25",
        "Получи 25 следов"
      ],
      "ZH": [
        "尾迹收藏 · 25",
        "拥有25种尾迹"
      ],
      "ES": [
        "COLECCIÓN DE ESTELAS · 25",
        "Consigue 25 estelas"
      ],
      "PT": [
        "COLEÇÃO DE RASTROS · 25",
        "Tenha 25 rastros"
      ]
    }
  }
];
  const number = value => Math.max(0, Number(value) || 0);
  function progress(item, save, wallet) {
    if (item.metric === 'score') return Math.max(...['EASY','NORMAL','HARD','EXTREME'].map(mode => number(save.best?.[mode])));
    if (['EASY','NORMAL','HARD','EXTREME'].includes(item.metric)) return number(save.best?.[item.metric]);
    if (['owned','maps','trails'].includes(item.metric)) return new Set(wallet[item.metric] || []).size;
    return number(save[item.metric]);
  }
  window.HighFlyAchievements = Object.freeze({items, progress, total: 40});
})();
