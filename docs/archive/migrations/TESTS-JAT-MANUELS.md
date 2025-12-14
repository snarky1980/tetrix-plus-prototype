#m 🧪 TESTS MANUELS - MODE JAT (Juste-à-temps)

**Date:** 14 décembre 2025  
**Mode testé:** JAT (Juste-à-temps)  
**Objectif:** Valider la logique métier de distribution JAT avec priorités

---

## SCÉNARIO 1: Tâche régulière simple
**Traducteur:** Julie-Marie Bissonnette  
**Horaire:** 9h-17h  
**Capacité:** 7h/jour  
**Type de tâche:** Traduction  
**N° projet:** 2025001  
**Heures totales:** 3h  
**Date échéance:** 16 décembre 2025  
**Heure échéance:** 13:00  
**Compte de mots:** 1500  
**Priorité:** Régulier

**✅ Résultat attendu:**  
- Lundi 16 déc: 10h00-13h00 (3h)

---

## SCÉNARIO 2: Tâche chevauchant deux jours
**Traducteur:** Isabelle Martin  
**Horaire:** 9h-17h  
**Capacité:** 7h/jour  
**Type de tâche:** Traduction  
**N° projet:** 2025002  
**Heures totales:** 6h  
**Date échéance:** 17 décembre 2025  
**Heure échéance:** 12:00  
**Compte de mots:** 3000  
**Priorité:** Urgent

**✅ Résultat attendu:**  
- Lundi 16 déc: 11h00-17h00 (6h)
- OU
- Lundi 16 déc: 14h00-17h00 (3h)
- Mardi 17 déc: 9h00-12h00 (3h)

---

## SCÉNARIO 3: Urgence immédiate
**Traducteur:** Patrick Kadnikov  
**Horaire:** 9h-17h  
**Capacité:** 7h/jour  
**Type de tâche:** Traduction  
**N° projet:** 2025003  
**Heures totales:** 1h  
**Date échéance:** 14 décembre 2025  
**Heure échéance:** 16:00  
**Compte de mots:** 500  
**Priorité:** Urgent

**✅ Résultat attendu:**  
- Aujourd'hui 14 déc: 15h00-16h00 (1h)

---

## SCÉNARIO 4: Tâche avec révision
**Traducteur:** Mélanie Lacasse  
**Horaire:** 8h30-16h30  
**Capacité:** 7h/jour  
**Type de tâche:** Traduction + Révision  
**N° projet:** 2025004  
**Heures totales:** 5.33h  
**Date échéance:** 18 décembre 2025  
**Heure échéance:** 14:00  
**Compte de mots:** 2000  
**Priorité:** Régulier

**✅ Résultat attendu:**  
- Mercredi 18 déc: 8h30-14h00 (5.5h)

---

## SCÉNARIO 5: Tâche longue multi-jours
**Traducteur:** Christian Laroche  
**Horaire:** 8h-16h50  
**Capacité:** 7h/jour  
**Type de tâche:** Traduction  
**N° projet:** 2025005  
**Heures totales:** 14h  
**Date échéance:** 20 décembre 2025  
**Heure échéance:** 16:00  
**Compte de mots:** 7000  
**Priorité:** Régulier

**✅ Résultat attendu:**  
- Jeudi 19 déc: 9h00-16h00 (7h)
- Vendredi 20 déc: 8h00-15h00 (7h)

---

## SCÉNARIO 6: Conflit avec tâche existante
**Traducteur:** Benoit Lavigne  
**Horaire:** 9h-17h  
**Capacité:** 7h/jour  
**Type de tâche:** Traduction  
**N° projet:** 2025006  
**Heures totales:** 2h  
**Date échéance:** 16 décembre 2025  
**Heure échéance:** 12:00  
**Compte de mots:** 1000  
**Priorité:** Urgent

**Note:** Tâche existante 13h-17h (4h)

**✅ Résultat attendu:**  
- Lundi 16 déc: 10h00-12h00 (2h)

---

## SCÉNARIO 7: Horaire matinal atypique
**Traducteur:** Ginette La Salle  
**Horaire:** 7h45-15h45  
**Capacité:** 7h/jour  
**Type de tâche:** Traduction  
**N° projet:** 2025007  
**Heures totales:** 5h  
**Date échéance:** 17 décembre 2025  
**Heure échéance:** 10:00  
**Compte de mots:** 2500  
**Priorité:** Urgent

**✅ Résultat attendu:**  
- Lundi 16 déc: 10h45-15h45 (5h)
- Mardi 17 déc: 7h45-10h00 (2.25h si débordement)

---

## SCÉNARIO 8: Micro-tâche rapide
**Traducteur:** Elizabeth Mann  
**Horaire:** 7h-15h  
**Capacité:** 7h/jour  
**Type de tâche:** Traduction  
**N° projet:** 2025008  
**Heures totales:** 0.5h  
**Date échéance:** 16 décembre 2025  
**Heure échéance:** 15:00  
**Compte de mots:** 250  
**Priorité:** Régulier

**✅ Résultat attendu:**  
- Lundi 16 déc: 14h30-15h00 (30 min)

---

## SCÉNARIO 9: Capacité maximale dépassée
**Traducteur:** Jimmy Lampron  
**Horaire:** 8h-16h  
**Capacité:** 7h/jour  
**Type de tâche:** Traduction  
**N° projet:** 2025009  
**Heures totales:** 2h  
**Date échéance:** 16 décembre 2025  
**Heure échéance:** 17:00  
**Compte de mots:** 1000  
**Priorité:** Régulier

**Note:** Lundi 16 déc déjà rempli (7h/7h)

**✅ Résultat attendu:**  
- Vendredi 13 déc: 14h00-16h00 (2h)

---

## SCÉNARIO 10: Multi-jours avec weekend
**Traducteur:** Diane Ouellet  
**Horaire:** 8h-16h  
**Capacité:** 7h/jour  
**Type de tâche:** Traduction  
**N° projet:** 2025010  
**Heures totales:** 12h  
**Date échéance:** 23 décembre 2025  
**Heure échéance:** 12:00  
**Compte de mots:** 6000  
**Priorité:** Régulier

**✅ Résultat attendu:**  
- Vendredi 20 déc: 9h00-16h00 (7h)
- Lundi 23 déc: 8h00-13h00 (5h)

---

## 📊 Résumé des tests
- ✅ 10 scénarios couvrant tous les cas JAT
- ✅ Priorités: 4 Urgent, 6 Régulier
- ✅ Horaires variés: 7h-15h, 7h45-15h45, 8h-16h, 8h30-16h30, 9h-17h
- ✅ Tâches: 30 min à 14h
- ✅ Conflits, chevauchements, weekends testés
