// Test de la logique de répartition

function estWeekend(date) {
  const jour = date.getDay();
  return jour === 0 || jour === 6; // 0 = dimanche, 6 = samedi
}

function calculerRepartitionEquilibree(heuresTotal, dateDebut, dateFin) {
  const debut = new Date(dateDebut);
  const fin = new Date(dateFin);
  
  // Calculer le nombre de jours dans l'intervalle
  const totalJours = Math.floor((fin.getTime() - debut.getTime()) / (1000*60*60*24)) + 1;
  
  console.log(`Total jours: ${totalJours}`);
  
  // Compter uniquement les jours ouvrables (lundi à vendredi)
  const joursOuvrables = [];
  for (let i = 0; i < totalJours; i++) {
    const dateCourante = new Date(debut.getTime() + i * 86400000);
    if (!estWeekend(dateCourante)) {
      joursOuvrables.push(dateCourante.toISOString().split('T')[0]);
    }
  }
  
  console.log(`Jours ouvrables: ${joursOuvrables.length}`);
  console.log(`Dates: ${joursOuvrables.join(', ')}`);
  
  // Répartir uniformément sur les jours ouvrables
  const heuresParJour = heuresTotal / joursOuvrables.length;
  const items = [];
  let cumul = 0;
  
  for (const date of joursOuvrables) {
    const h = parseFloat(heuresParJour.toFixed(4));
    cumul += h;
    items.push({ date, heures: h });
  }
  
  // Ajuster la dernière valeur pour compenser les erreurs d'arrondi
  const diff = parseFloat((heuresTotal - cumul).toFixed(4));
  if (Math.abs(diff) >= 0.0001) {
    items[items.length - 1].heures = parseFloat((items[items.length - 1].heures + diff).toFixed(4));
  }
  
  return items;
}

// Test 1: Équilibré sur 5 jours ouvrables
console.log('\n=== Test ÉQUILIBRÉ: 20h sur 5 jours ===');
const result1 = calculerRepartitionEquilibree(20, '2025-12-08', '2025-12-12');
console.log('Répartition:');
result1.forEach(r => console.log(`  ${r.date}: ${r.heures}h`));
console.log(`Total: ${result1.reduce((s, r) => s + r.heures, 0)}h`);

// Test 2: PEPS sur 7 jours (incluant un weekend)
console.log('\n=== Test PEPS: 15h du 8 au 16 déc (avec weekend) ===');
const result2 = calculerRepartitionEquilibree(15, '2025-12-08', '2025-12-16');
console.log('Répartition:');
result2.forEach(r => console.log(`  ${r.date}: ${r.heures}h`));
console.log(`Total: ${result2.reduce((s, r) => s + r.heures, 0)}h`);
