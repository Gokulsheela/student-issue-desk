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
    const { complaintId } = await req.json();
    
    if (!complaintId) {
      return new Response(
        JSON.stringify({ error: 'complaintId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the target complaint
    const { data: targetComplaint, error: targetError } = await supabase
      .from('complaints')
      .select('id, title, description, category, status, created_at')
      .eq('id', complaintId)
      .single();

    if (targetError || !targetComplaint) {
      console.error('Error fetching target complaint:', targetError);
      return new Response(
        JSON.stringify({ error: 'Complaint not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch other complaints (excluding the target)
    const { data: otherComplaints, error: otherError } = await supabase
      .from('complaints')
      .select('id, title, description, category, status, created_at, student_id')
      .neq('id', complaintId)
      .order('created_at', { ascending: false })
      .limit(50); // Limit to recent 50 complaints for performance

    if (otherError) {
      console.error('Error fetching other complaints:', otherError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch complaints' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!otherComplaints || otherComplaints.length === 0) {
      return new Response(
        JSON.stringify({ similar_complaints: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch student names for other complaints
    const studentIds = [...new Set(otherComplaints.map(c => c.student_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', studentIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p.name]) || []);

    // Prepare complaints for AI analysis
    const complaintsForAnalysis = otherComplaints.map((c, idx) => ({
      index: idx,
      id: c.id,
      title: c.title,
      description: c.description.substring(0, 300), // Truncate for token efficiency
      category: c.category,
    }));

    // Use AI to find similar complaints
    const systemPrompt = `You are an AI assistant that analyzes student complaints to find similar or duplicate issues. 
Analyze the target complaint and compare it with other complaints to identify semantic similarity.
Return your analysis as a JSON array with this exact structure:
[
  {
    "complaint_id": "uuid-string",
    "similarity_score": 0.0-1.0,
    "reason": "brief explanation"
  }
]
Only include complaints with similarity_score >= 0.6. Return empty array [] if no similar complaints found.`;

    const userPrompt = `Target Complaint:
Title: ${targetComplaint.title}
Description: ${targetComplaint.description}
Category: ${targetComplaint.category}

Other Complaints to Compare:
${complaintsForAnalysis.map((c, idx) => `
[${idx}] ID: ${c.id}
Title: ${c.title}
Description: ${c.description}
Category: ${c.category}
`).join('\n---\n')}

Identify complaints that are similar or duplicate to the target complaint. Focus on semantic meaning, not just keyword matching.`;

    console.log('Calling Lovable AI for similarity analysis...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'AI analysis failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResult = await aiResponse.json();
    const aiContent = aiResult.choices?.[0]?.message?.content || '[]';
    
    console.log('AI Response:', aiContent);

    // Parse AI response
    let similarityResults: Array<{complaint_id: string, similarity_score: number, reason: string}> = [];
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = aiContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, aiContent];
      const jsonStr = jsonMatch[1].trim();
      similarityResults = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError, aiContent);
      similarityResults = [];
    }

    // Build the response with full complaint details
    const similarComplaints = similarityResults
      .map(result => {
        const complaint = otherComplaints.find(c => c.id === result.complaint_id);
        if (!complaint) return null;
        
        return {
          id: complaint.id,
          title: complaint.title,
          description: complaint.description,
          category: complaint.category,
          status: complaint.status,
          created_at: complaint.created_at,
          student_name: profileMap.get(complaint.student_id) || 'Unknown',
          similarity_score: result.similarity_score,
          similarity_reason: result.reason,
        };
      })
      .filter(c => c !== null)
      .sort((a, b) => b!.similarity_score - a!.similarity_score);

    console.log(`Found ${similarComplaints.length} similar complaints for complaint ${complaintId}`);

    return new Response(
      JSON.stringify({ similar_complaints: similarComplaints }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in find-similar-complaints:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
