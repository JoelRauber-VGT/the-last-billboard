import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const { data, error } = await supabase
  .from('slots')
  .select('*')
  .eq('id', 'bd5dd18c-4681-4720-a31e-8564ffe2a8f9');

if (error) {
  console.error('Error:', error);
} else {
  console.log('Slot found:', JSON.stringify(data, null, 2));
}

// Also check all active slots
const { data: allSlots, error: allError } = await supabase
  .from('slots')
  .select('id, display_name, current_bid_eur, status')
  .eq('status', 'active')
  .order('current_bid_eur', { ascending: false });

if (allError) {
  console.error('Error fetching all slots:', allError);
} else {
  console.log('\nAll active slots:', JSON.stringify(allSlots, null, 2));
}
