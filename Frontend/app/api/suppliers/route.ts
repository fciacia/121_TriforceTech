import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const supabaseUrl = process.env.SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_KEY!
  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    // 1. Fetch all contracts for the primary SME (SME1 - TriforceTech)
    const { data: contracts, error: contractErr } = await supabase
      .from('sme_contracts')
      .select('supplier_id')
      .eq('sme_id', 'SME1')

    if (contractErr) throw contractErr

    const supplierIds = contracts.map(c => c.supplier_id)

    // 2. Fetch details for these specific suppliers
    const { data: supplierDetails, error: supErr } = await supabase
      .from('suppliers')
      .select('supplier_id, name, cert_status')
      .in('supplier_id', supplierIds)

    if (supErr) throw supErr

    // Format for frontend
    const suppliers = supplierDetails.map(s => ({
      id: s.supplier_id,
      name: s.name,
      certStatus: s.cert_status || 'none'
    }))

    return NextResponse.json({ suppliers })

  } catch (err: any) {
    console.error("Suppliers API Error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
