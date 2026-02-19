import { supabase } from '../services/supabase';
import { GROUP_MEMBERS } from '../constants';

const DEFAULT_PASSWORD = '12345';

async function seed() {
  console.log('Iniciando seed de usuários...');

  for (const member of GROUP_MEMBERS) {
    try {
      // Verifica existência por nome (case-insensitive)
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .ilike('name', member.name)
        .maybeSingle();

      if (existing) {
        console.log(`Já existe: ${member.name} (pulando)`);
        continue;
      }

      const { data, error } = await supabase
        .from('profiles')
        .insert({
          name: member.name,
          password: DEFAULT_PASSWORD,
          streak: 0,
          score: 0
        })
        .select()
        .single();

      if (error) {
        console.error(`Erro ao criar ${member.name}:`, error);
      } else {
        console.log(`Criado: ${member.name} (id: ${data.id})`);
      }
    } catch (err) {
      console.error(`Erro no seed para ${member.name}:`, err);
    }
  }

  console.log('Seed finalizado.');
}

seed().catch((e) => {
  console.error('Seed falhou:', e);
  process.exit(1);
});

