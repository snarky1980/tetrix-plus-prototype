import { describe, it, expect } from 'vitest';
import {
  createOttawaDate,
  parseOttawaDateISO,
  formatOttawaISO,
  nowOttawa,
  todayOttawa,
  startOfDayOttawa,
  isSameDayOttawa,
  addDaysOttawa,
  subDaysOttawa,
  differenceInDaysOttawa,
  normalizeToOttawa,
  isWeekendOttawa,
  businessDaysOttawa,
  validateNotPast,
  validateDateRange,
  OTTAWA_TIMEZONE
} from '../src/utils/dateTimeOttawa';

describe('dateTimeOttawa - Création de dates', () => {
  it('createOttawaDate crée minuit Ottawa correctement', () => {
    const date = createOttawaDate(2025, 12, 8);
    const formatted = formatOttawaISO(date);
    expect(formatted).toBe('2025-12-08');
  });

  it('parseOttawaDateISO parse format YYYY-MM-DD', () => {
    const date = parseOttawaDateISO('2025-12-08');
    expect(formatOttawaISO(date)).toBe('2025-12-08');
  });

  it('parseOttawaDateISO rejette formats invalides', () => {
    expect(() => parseOttawaDateISO('08-12-2025')).toThrow();
    expect(() => parseOttawaDateISO('2025/12/08')).toThrow();
    expect(() => parseOttawaDateISO('invalid')).toThrow();
  });

  it('startOfDayOttawa normalise à minuit Ottawa', () => {
    // Date avec heure dans la journée
    const date = new Date('2025-12-08T15:30:00Z');
    const minuit = startOfDayOttawa(date);
    const formatted = formatOttawaISO(minuit);
    expect(formatted).toBe('2025-12-08');
  });
});

describe('dateTimeOttawa - Comparaisons', () => {
  it('isSameDayOttawa identifie même jour', () => {
    const date1 = parseOttawaDateISO('2025-12-08');
    const date2 = new Date('2025-12-08T23:59:00'); // 23h59 le même jour
    expect(isSameDayOttawa(date1, date2)).toBe(true);
  });

  it('isSameDayOttawa distingue jours différents', () => {
    const date1 = parseOttawaDateISO('2025-12-08');
    const date2 = parseOttawaDateISO('2025-12-09');
    expect(isSameDayOttawa(date1, date2)).toBe(false);
  });

  it('differenceInDaysOttawa calcule différence correctement', () => {
    const debut = parseOttawaDateISO('2025-12-08');
    const fin = parseOttawaDateISO('2025-12-10');
    expect(differenceInDaysOttawa(debut, fin)).toBe(2);
  });

  it('differenceInDaysOttawa gère ordre inversé', () => {
    const debut = parseOttawaDateISO('2025-12-10');
    const fin = parseOttawaDateISO('2025-12-08');
    expect(differenceInDaysOttawa(debut, fin)).toBe(-2);
  });
});

describe('dateTimeOttawa - Opérations arithmétiques', () => {
  it('addDaysOttawa ajoute jours correctement', () => {
    const date = parseOttawaDateISO('2025-12-08');
    const demain = addDaysOttawa(date, 1);
    expect(formatOttawaISO(demain)).toBe('2025-12-09');
  });

  it('subDaysOttawa soustrait jours correctement', () => {
    const date = parseOttawaDateISO('2025-12-08');
    const hier = subDaysOttawa(date, 1);
    expect(formatOttawaISO(hier)).toBe('2025-12-07');
  });

  it('addDaysOttawa gère changement de mois', () => {
    const date = parseOttawaDateISO('2025-11-30');
    const deuxJoursPlus = addDaysOttawa(date, 2);
    expect(formatOttawaISO(deuxJoursPlus)).toBe('2025-12-02');
  });

  it('addDaysOttawa gère changement année', () => {
    const date = parseOttawaDateISO('2025-12-31');
    const lendemain = addDaysOttawa(date, 1);
    expect(formatOttawaISO(lendemain)).toBe('2026-01-01');
  });
});

describe('dateTimeOttawa - DST (Daylight Saving Time)', () => {
  it('gère transition DST printemps (avancer 1h)', () => {
    // En 2025, DST commence le 9 mars à 2h → 3h
    const avantDST = parseOttawaDateISO('2025-03-08'); // Samedi avant
    const apresDST = parseOttawaDateISO('2025-03-10'); // Lundi après
    
    // Les deux dates doivent être correctement formatées
    expect(formatOttawaISO(avantDST)).toBe('2025-03-08');
    expect(formatOttawaISO(apresDST)).toBe('2025-03-10');
    
    // Différence doit être 2 jours calendaires
    expect(differenceInDaysOttawa(avantDST, apresDST)).toBe(2);
  });

  it('gère transition DST automne (reculer 1h)', () => {
    // En 2025, DST termine le 2 novembre à 2h → 1h
    const avantDST = parseOttawaDateISO('2025-11-01'); // Samedi avant
    const apresDST = parseOttawaDateISO('2025-11-03'); // Lundi après
    
    expect(formatOttawaISO(avantDST)).toBe('2025-11-01');
    expect(formatOttawaISO(apresDST)).toBe('2025-11-03');
    expect(differenceInDaysOttawa(avantDST, apresDST)).toBe(2);
  });

  it('businessDaysOttawa exclut weekends durant transition DST', () => {
    // Période incluant transition DST printemps 2025
    const debut = parseOttawaDateISO('2025-03-06'); // Jeudi
    const fin = parseOttawaDateISO('2025-03-12');   // Mercredi
    const jours = businessDaysOttawa(debut, fin);
    
    // Jeudi 6, Vendredi 7, Lundi 10, Mardi 11, Mercredi 12 = 5 jours
    expect(jours.length).toBe(5);
    
    // Vérifier que samedi 8 et dimanche 9 sont exclus
    const datesStr = jours.map(d => formatOttawaISO(d));
    expect(datesStr).not.toContain('2025-03-08');
    expect(datesStr).not.toContain('2025-03-09');
  });
});

describe('dateTimeOttawa - Weekends', () => {
  it('isWeekendOttawa identifie samedi', () => {
    const samedi = parseOttawaDateISO('2025-12-13'); // Samedi
    expect(isWeekendOttawa(samedi)).toBe(true);
  });

  it('isWeekendOttawa identifie dimanche', () => {
    const dimanche = parseOttawaDateISO('2025-12-14'); // Dimanche
    expect(isWeekendOttawa(dimanche)).toBe(true);
  });

  it('isWeekendOttawa identifie jours semaine', () => {
    const lundi = parseOttawaDateISO('2025-12-08'); // Lundi
    const vendredi = parseOttawaDateISO('2025-12-12'); // Vendredi
    expect(isWeekendOttawa(lundi)).toBe(false);
    expect(isWeekendOttawa(vendredi)).toBe(false);
  });

  it('businessDaysOttawa retourne uniquement jours ouvrables', () => {
    // Du lundi 8 au dimanche 14 décembre 2025
    const debut = parseOttawaDateISO('2025-12-08');
    const fin = parseOttawaDateISO('2025-12-14');
    const jours = businessDaysOttawa(debut, fin);
    
    // Lun, Mar, Mer, Jeu, Ven = 5 jours
    expect(jours.length).toBe(5);
    
    // Vérifier aucun weekend
    jours.forEach(jour => {
      expect(isWeekendOttawa(jour)).toBe(false);
    });
  });

  it('businessDaysOttawa gère période sans jours ouvrables', () => {
    // Weekend complet
    const samedi = parseOttawaDateISO('2025-12-13');
    const dimanche = parseOttawaDateISO('2025-12-14');
    const jours = businessDaysOttawa(samedi, dimanche);
    
    expect(jours.length).toBe(0);
  });

  it('businessDaysOttawa gère un seul jour ouvrable', () => {
    const lundi = parseOttawaDateISO('2025-12-08');
    const jours = businessDaysOttawa(lundi, lundi);
    
    expect(jours.length).toBe(1);
    expect(formatOttawaISO(jours[0])).toBe('2025-12-08');
  });
});

describe('dateTimeOttawa - Normalisation', () => {
  it('normalizeToOttawa accepte Date', () => {
    const input = new Date('2025-12-08T15:30:00Z');
    const { date, iso } = normalizeToOttawa(input, 'test');
    
    expect(iso).toBe('2025-12-08');
    expect(date).toBeInstanceOf(Date);
  });

  it('normalizeToOttawa accepte string YYYY-MM-DD', () => {
    const { date, iso } = normalizeToOttawa('2025-12-08', 'test');
    
    expect(iso).toBe('2025-12-08');
    expect(date).toBeInstanceOf(Date);
  });

  it('normalizeToOttawa accepte ISO complet avec heure', () => {
    const { date, iso } = normalizeToOttawa('2025-12-08T12:30:00Z', 'test');
    
    expect(iso).toBe('2025-12-08');
    expect(date).toBeInstanceOf(Date);
  });

  it('normalizeToOttawa rejette format invalide', () => {
    expect(() => normalizeToOttawa('invalide', 'test')).toThrow();
  });

  it('normalizeToOttawa utilise label dans erreur', () => {
    try {
      normalizeToOttawa('invalide', 'dateEcheance');
      expect.fail('Devrait lancer erreur');
    } catch (err: any) {
      expect(err.message).toContain('dateEcheance');
    }
  });
});

describe('dateTimeOttawa - Validation', () => {
  it('validateNotPast accepte date future', () => {
    // Créer date dans 10 jours
    const future = addDaysOttawa(todayOttawa(), 10);
    expect(() => validateNotPast(future, 'Test')).not.toThrow();
  });

  it('validateNotPast accepte date aujourd\'hui', () => {
    const today = todayOttawa();
    expect(() => validateNotPast(today, 'Test')).not.toThrow();
  });

  it('validateNotPast rejette date passée', () => {
    const passe = subDaysOttawa(todayOttawa(), 1);
    expect(() => validateNotPast(passe, 'Test')).toThrow('passé');
  });

  it('validateDateRange accepte ordre correct', () => {
    const debut = parseOttawaDateISO('2025-12-08');
    const fin = parseOttawaDateISO('2025-12-15');
    expect(() => validateDateRange(debut, fin)).not.toThrow();
  });

  it('validateDateRange accepte dates égales', () => {
    const date = parseOttawaDateISO('2025-12-08');
    expect(() => validateDateRange(date, date)).not.toThrow();
  });

  it('validateDateRange rejette ordre inversé', () => {
    const debut = parseOttawaDateISO('2025-12-15');
    const fin = parseOttawaDateISO('2025-12-08');
    expect(() => validateDateRange(debut, fin)).toThrow();
  });
});

describe('dateTimeOttawa - Cas limites', () => {
  it('gère année bissextile (29 février)', () => {
    // 2024 est bissextile
    const date = parseOttawaDateISO('2024-02-29');
    expect(formatOttawaISO(date)).toBe('2024-02-29');
    
    const lendemain = addDaysOttawa(date, 1);
    expect(formatOttawaISO(lendemain)).toBe('2024-03-01');
  });

  it('gère fin/début de mois', () => {
    const finNovembre = parseOttawaDateISO('2025-11-30');
    const debutDecembre = addDaysOttawa(finNovembre, 1);
    expect(formatOttawaISO(debutDecembre)).toBe('2025-12-01');
  });

  it('gère fin/début d\'année', () => {
    const finAnnee = parseOttawaDateISO('2025-12-31');
    const nouvelAn = addDaysOttawa(finAnnee, 1);
    expect(formatOttawaISO(nouvelAn)).toBe('2026-01-01');
  });

  it('businessDaysOttawa gère grande plage de dates', () => {
    const debut = parseOttawaDateISO('2025-01-01'); // Mercredi
    const fin = parseOttawaDateISO('2025-12-31');   // Mercredi
    const jours = businessDaysOttawa(debut, fin);
    
    // 2025 a 365 jours, environ 260 jours ouvrables
    expect(jours.length).toBeGreaterThan(250);
    expect(jours.length).toBeLessThan(270);
    
    // Vérifier aucun weekend
    jours.forEach(jour => {
      expect(isWeekendOttawa(jour)).toBe(false);
    });
  });
});

describe('dateTimeOttawa - Cohérence avec UTC', () => {
  it('maintient cohérence date indépendamment heure serveur', () => {
    // Tester que peu importe l'heure de création,
    // la date Ottawa reste la même
    const dateStr = '2025-12-08';
    const date1 = parseOttawaDateISO(dateStr);
    
    // Simuler différentes heures UTC qui tombent le 8 décembre à Ottawa
    const date2 = new Date('2025-12-08T05:00:00Z'); // 00h00 Ottawa (UTC-5)
    const date3 = new Date('2025-12-08T17:00:00Z'); // 12h00 Ottawa
    const date4 = new Date('2025-12-09T04:59:00Z'); // 23h59 Ottawa le 8
    
    // Tous doivent représenter le 8 décembre à Ottawa
    expect(formatOttawaISO(date1)).toBe(dateStr);
    expect(formatOttawaISO(date2)).toBe(dateStr);
    expect(formatOttawaISO(date3)).toBe(dateStr);
    expect(formatOttawaISO(date4)).toBe(dateStr);
  });

  it('comparaisons dates indépendantes fuseau serveur', () => {
    // Créer deux dates de manières différentes
    const d1 = parseOttawaDateISO('2025-12-08');
    const d2 = new Date('2025-12-08T05:00:00Z'); // 00h00 Ottawa (UTC-5)
    
    // Doivent être reconnues comme même jour
    expect(isSameDayOttawa(d1, startOfDayOttawa(d2))).toBe(true);
  });
});

describe('dateTimeOttawa - Performance', () => {
  it('businessDaysOttawa performant sur 1 an', () => {
    const debut = parseOttawaDateISO('2025-01-01');
    const fin = parseOttawaDateISO('2025-12-31');
    
    const start = Date.now();
    const jours = businessDaysOttawa(debut, fin);
    const duration = Date.now() - start;
    
    // Doit terminer en moins de 100ms
    expect(duration).toBeLessThan(100);
    expect(jours.length).toBeGreaterThan(0);
  });

  it('formatage dates performant', () => {
    const dates = Array.from({ length: 365 }, (_, i) => 
      addDaysOttawa(parseOttawaDateISO('2025-01-01'), i)
    );
    
    const start = Date.now();
    const formatted = dates.map(d => formatOttawaISO(d));
    const duration = Date.now() - start;
    
    // 365 formatages en moins de 50ms
    expect(duration).toBeLessThan(50);
    expect(formatted.length).toBe(365);
  });
});
