const { repartitionJusteATemps } = require('./dist/services/repartitionService');

async function test() {
  // Simuler 14h, deadline 23 déc 2025 à 16h
  const resultat = await repartitionJusteATemps(
    'traducteur-test-id',
    14,
    '2025-12-23T16:00:00',
    { debug: true, modeTimestamp: true }
  );
  
  console.log('\n📊 Résultat allocation:');
  resultat.forEach(r => {
    console.log(`   ${r.date}: ${r.heures}h (${r.heureDebut}-${r.heureFin})`);
  });
  console.log(`   Total: ${resultat.reduce((s, r) => s + r.heures, 0)}h`);
}

test().catch(console.error);
