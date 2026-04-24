window.PARFECT_COACH_KNOWLEDGE_V2 = {
  swing: {
    tempo: {
      goal: "Créer un rythme répétable, pas un swing parfait.",
      detects: ["tempo trop rapide", "transition brutale", "backswing précipité"],
      principles: [
        "Le tempo doit rester stable sous pression.",
        "Un bon rythme donne souvent plus de régularité qu’un changement technique."
      ],
      drills: [
        "3 swings à 70% en comptant 1-2-3 à la montée, 1 à la descente.",
        "Marque une micro-pause mentale au top, sans bloquer le corps."
      ],
      coachTone: "Calme, simple, orienté sensation."
    },

    rotation: {
      goal: "Tourner sans perdre la stabilité.",
      detects: ["épaules insuffisantes", "hanches trop actives", "dissociation faible"],
      principles: [
        "La rotation utile est celle qui reste contrôlée.",
        "La priorité est de garder un axe stable."
      ],
      drills: [
        "3 swings lents en sentant les épaules tourner autour d’un axe calme.",
        "Swing sans balle : finir équilibré avant de chercher plus d’amplitude."
      ]
    },

    triangle: {
      goal: "Garder la connexion bras/épaules.",
      detects: ["bras qui se déconnectent", "triangle instable", "impact désorganisé"],
      principles: [
        "Un triangle stable aide à répéter le contact.",
        "La connexion compte plus que la force."
      ],
      drills: [
        "Serviette sous les bras, 5 demi-swings calmes.",
        "Cherche un mouvement compact, propre, sans forcer."
      ]
    },

    weightShift: {
      goal: "Transférer progressivement vers l’avant.",
      detects: ["poids bloqué arrière", "transfert tardif", "appui avant insuffisant"],
      principles: [
        "Le transfert doit être progressif, pas violent.",
        "Le finish donne beaucoup d’information sur la qualité du transfert."
      ],
      drills: [
        "Tiens le finish 2 secondes après chaque swing.",
        "Fais 3 swings en cherchant une pression stable sur le pied avant."
      ]
    },

    extension: {
      goal: "Laisser les bras s’allonger après impact.",
      detects: ["bras qui se replient tôt", "extension courte", "release bloqué"],
      principles: [
        "L’extension vient après un contact organisé.",
        "Il ne faut pas pousser avec les bras, il faut laisser sortir le mouvement."
      ],
      drills: [
        "Demi-swings avec finish bras longs.",
        "Imagine que la balle part vers une cible basse devant toi."
      ]
    },

    balance: {
      goal: "Finir stable et contrôlé.",
      detects: ["finish instable", "tête qui bouge", "perte d’équilibre"],
      principles: [
        "Le finish est le révélateur du swing.",
        "Un swing maîtrisé doit pouvoir être tenu 2 secondes."
      ],
      drills: [
        "Après chaque swing, tiens le finish et compte jusqu’à 2.",
        "Réduis l’intensité à 70% jusqu’à retrouver l’équilibre."
      ]
    }
  },

  mental: {
    routine: {
      goal: "Créer un script simple avant chaque coup.",
      principles: [
        "Une seule intention par coup.",
        "On juge la qualité de la routine, pas seulement le résultat.",
        "Sous pression, la routine doit devenir plus simple, pas plus longue."
      ],
      script: [
        "1. Quelle est ma cible ?",
        "2. Quel est le coup raisonnable ?",
        "3. Quelle est mon intention en 3 mots ?",
        "4. Respiration.",
        "5. Action."
      ]
    },

    pressure: {
      goal: "Revenir au coup jouable.",
      principles: [
        "Sous pression, on réduit l’ambition.",
        "Le bon coup est souvent celui qui garde la balle en jeu.",
        "Le mental fort, c’est accepter l’option simple."
      ],
      drills: [
        "Respiration 4 secondes inspiration / 6 secondes expiration.",
        "Phrase courte : cible, rythme, équilibre."
      ]
    },

    postBadShot: {
      goal: "Ne pas laisser un mauvais coup décider du suivant.",
      principles: [
        "Un mauvais coup est une information, pas une identité.",
        "Le prochain coup doit être choisi froidement.",
        "Le score se protège par les décisions."
      ],
      reset: [
        "Regarde la situation réelle.",
        "Choisis l’option qui remet la balle en jeu.",
        "Accepte bogey si nécessaire."
      ]
    }
  },

  caddy: {
    decisionFramework: {
      questions: [
        "Quelle est la cible la plus sûre ?",
        "Où est le danger à éviter absolument ?",
        "Quel club me donne le plus de marge ?",
        "Quel coup puis-je rater correctement ?",
        "Est-ce que ce choix protège mon score ?"
      ],
      rules: [
        "Entre deux clubs, choisir le club qui couvre le danger principal.",
        "Si le danger est court, prendre plus de club.",
        "Si le danger est long, prendre moins de club.",
        "Si le lie est mauvais, réduire l’ambition.",
        "Si le joueur hésite, choisir l’option la plus simple à exécuter."
      ]
    },

    clubChoice: {
      defaultAnswer: "Je choisis le club qui me donne la meilleure marge, pas celui qui demande le coup parfait.",
      betweenTwoClubs: [
        "Si tu dois forcer le petit club, prends le grand club en swing contrôlé.",
        "Si le grand club amène un danger long, prends le petit club et accepte court.",
        "Si le vent est contre, monte d’un club.",
        "Si le lie est moyen, monte d’un club et swingue plus simple.",
        "Si tu es sous pression, prends le club avec lequel tu peux faire ton swing normal."
      ]
    },

    onCourseModes: {
      attack: "Attaque seulement si le mauvais coup reste jouable.",
      safe: "Joue la zone large, accepte un putt plus long ou une approche simple.",
      recovery: "Remets la balle en jeu. Pas de héros.",
      protectScore: "Protège le double. Le bogey peut être un bon score."
    }
  },

  answerRules: {
    neverSay: [
      "filme un swing de face et de profil",
      "envoie les landmarks MediaPipe",
      "je ne peux pas analyser sans vidéo",
      "change complètement ton swing"
    ],
    alwaysDo: [
      "donner une seule priorité",
      "donner une action simple",
      "séparer swing, mental et stratégie",
      "répondre comme un coach/caddy de terrain"
    ]
  }
};
