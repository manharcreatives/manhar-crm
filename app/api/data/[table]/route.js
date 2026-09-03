import { NextResponse } from 'next/server';
import supabaseAdmin from '@/app/lib/supabase-server';

const COOKIE_KEY = 'manhar_auth';
const ALLOWED_TABLES = ['clients', 'crm', 'payments', 'invoices', 'services', 'expenses'];

function toSnake(str) {
  return str.replace(/[A-Z]/g, m => '_' + m.toLowerCase());
}

function objToDb(obj) {
  const result = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      result[toSnake(key)] = obj[key];
    }
  }
  return result;
}

function checkAuth(request) {
  const authCookie = request.cookies.get(COOKIE_KEY)?.value;
  if (authCookie !== 'true') {
    return false;
  }
  return true;
}

function validateTable(table) {
  return ALLOWED_TABLES.includes(table);
}

export async function GET(request, { params }) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { table } = await params;
  if (!validateTable(table)) {
    return NextResponse.json({ error: 'Invalid table' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.from(table).select('*');
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

export async function POST(request, { params }) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { table } = await params;
  if (!validateTable(table)) {
    return NextResponse.json({ error: 'Invalid table' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const records = Array.isArray(body) ? body : [body];
    const dbRecords = records.map(objToDb);

    const { data, error } = await supabaseAdmin.from(table).insert(dbRecords).select();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

export async function PATCH(request, { params }) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { table } = await params;
  if (!validateTable(table)) {
    return NextResponse.json({ error: 'Invalid table' }, { status: 400 });
  }

  try {
    const { id, client_id, data: updateData } = await request.json();
    if (!updateData) {
      return NextResponse.json({ error: 'data field required' }, { status: 400 });
    }

    const dbData = objToDb(updateData);
    const matchColumn = table === 'crm' ? 'client_id' : 'id';
    const matchValue = table === 'crm' ? client_id : id;

    if (!matchValue) {
      return NextResponse.json({ error: `${matchColumn} required` }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from(table)
      .update(dbData)
      .eq(matchColumn, matchValue)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { table } = await params;
  if (!validateTable(table)) {
    return NextResponse.json({ error: 'Invalid table' }, { status: 400 });
  }

  try {
    const { id, ids, client_id } = await request.json();
    const matchColumn = table === 'crm' ? 'client_id' : 'id';

    let query;
    if (ids && Array.isArray(ids)) {
      query = supabaseAdmin.from(table).delete().in('id', ids);
    } else {
      const matchValue = table === 'crm' ? client_id : id;
      if (!matchValue) {
        return NextResponse.json({ error: 'id required' }, { status: 400 });
      }
      query = supabaseAdmin.from(table).delete().eq(matchColumn, matchValue);
    }

    const { error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
