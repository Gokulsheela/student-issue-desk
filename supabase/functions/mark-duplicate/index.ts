import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { duplicateComplaintId, originalComplaintId } = await req.json();
    
    if (!duplicateComplaintId || !originalComplaintId) {
      return new Response(
        JSON.stringify({ error: 'Both duplicateComplaintId and originalComplaintId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate that the IDs are different
    if (duplicateComplaintId === originalComplaintId) {
      return new Response(
        JSON.stringify({ error: 'A complaint cannot be marked as duplicate of itself' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify both complaints exist
    const { data: originalComplaint, error: originalError } = await supabase
      .from('complaints')
      .select('id, is_duplicate')
      .eq('id', originalComplaintId)
      .single();

    if (originalError || !originalComplaint) {
      console.error('Original complaint not found:', originalError);
      return new Response(
        JSON.stringify({ error: 'Original complaint not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent marking as duplicate of another duplicate
    if (originalComplaint.is_duplicate) {
      return new Response(
        JSON.stringify({ error: 'Cannot mark as duplicate of another duplicate complaint. Please select the original complaint.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: duplicateComplaint, error: duplicateError } = await supabase
      .from('complaints')
      .select('id, is_duplicate')
      .eq('id', duplicateComplaintId)
      .single();

    if (duplicateError || !duplicateComplaint) {
      console.error('Duplicate complaint not found:', duplicateError);
      return new Response(
        JSON.stringify({ error: 'Complaint to mark as duplicate not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already marked as duplicate
    if (duplicateComplaint.is_duplicate) {
      return new Response(
        JSON.stringify({ error: 'This complaint is already marked as a duplicate' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark the complaint as duplicate
    const { error: updateError } = await supabase
      .from('complaints')
      .update({
        is_duplicate: true,
        duplicate_of: originalComplaintId,
      })
      .eq('id', duplicateComplaintId);

    if (updateError) {
      console.error('Error marking complaint as duplicate:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to mark complaint as duplicate: ' + updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully marked complaint ${duplicateComplaintId} as duplicate of ${originalComplaintId}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Complaint marked as duplicate successfully',
        duplicate_complaint_id: duplicateComplaintId,
        original_complaint_id: originalComplaintId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in mark-duplicate:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});