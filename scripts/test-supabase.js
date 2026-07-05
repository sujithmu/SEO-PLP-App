import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://izixgazlbase.co'; // ❌ This looks incorrect - should be project ref
const supabaseKey = 'eyJhbGciOiJIzZSIsInJlZiI6Iml6aXhnYXpsb2diYXh0Y2RqcW96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwODIyMzEsImV4cCI6DmN0na93QQQ0WPqiSKOXFLRMvYl26CS4Gik';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    const { data, error } = await supabase.from('keywords').select('count(*)', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Supabase error:', error);
    } else {
      console.log('✅ Supabase connected successfully!');
      console.log('✅ Table "keywords" exists or is ready');
    }
  } catch (error) {
    console.error('❌ Supabase connection failed:', error.message);
  }
}

testConnection();