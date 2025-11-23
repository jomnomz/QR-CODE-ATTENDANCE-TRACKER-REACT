import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export function useSupabaseData(tableName) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from(tableName)
          .select('*');
        
        if (error) {
          setError(error);
        } else {
          setData(data || []);
        }
      } catch (error) {
        setError(error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [tableName]);

  return { data, loading, error };
}