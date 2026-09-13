export function validateSourceView(view, tables, { required = false } = {}) {
  const populated=(tables??[]).filter(table=>table.rows?.length);
  if(!populated.length) { if(required) throw new Error('Source layout check: '+view+' returned no rows'); return; }
  const requiredHeaders={standings:['Team#','Team','WON','LOST'],bowlers:['Name','Team#','Games','Avg'],recaps:['Game 1','Game 2','Game 3'],lanes:['Lane','Team#'],rosters:['Name','Gms','Avg']};
  for(const table of populated) {
    const headers=new Set(table.headers.map(header=>header.toLowerCase()));
    const missing=(requiredHeaders[view]??[]).filter(header=>!headers.has(header.toLowerCase()));
    if(missing.length) throw new Error('Source layout check: '+view+' missing columns '+missing.join(', '));
    if(view==='recaps'&&!table.rows.some(row=>/^Team \d+$/i.test(row[0]??''))) throw new Error('Source layout check: recap team labels could not be matched');
  }
}
