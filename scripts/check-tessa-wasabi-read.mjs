// Read-only operator check. Does not change photo_backend or assume an anonymous
// empty metadata result means that the database or bucket is empty.
import { createClient } from '@supabase/supabase-js';
import { TESSA_ID, VELVET_ID, validLuceroKey, productionSigner } from '../services/wasabi-photos/handler.mjs';

try {
  if (process.argv.length > 3 || (process.argv[2] && process.argv[2] !== '--velvet')) throw Error();
  const horseId = process.argv[2] === '--velvet' ? VELVET_ID : TESSA_ID;
  const client = createClient('https://zmxppbpywizdjlhstfkf.supabase.co', process.env.VITE_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.from('images_wasabi')
    .select('storage_path_enhanced').eq('horse_id', horseId)
    .not('storage_path_enhanced', 'is', null)
    .order('captured_at', { ascending: false }).order('id', { ascending: false }).limit(1)
    .abortSignal(AbortSignal.timeout(10000));
  if (error) {
    console.log(JSON.stringify({ realGetVerified: false, reason: 'metadata_query_unavailable' }));
  } else if (!data?.length) {
    console.log(JSON.stringify({ realGetVerified: false, reason: 'no_test_object_visible_to_public_metadata_query' }));
  } else if (!validLuceroKey(data[0].storage_path_enhanced, horseId)) {
    console.log(JSON.stringify({ realGetVerified: false, reason: 'test_object_outside_approved_prefix' }));
    process.exitCode = 1;
  } else {
    const sign = await productionSigner(process.env);
    const url = await sign(data[0].storage_path_enhanced);
    const response = await fetch(url, {
      headers: { Range: 'bytes=0-255' }, redirect: 'error', signal: AbortSignal.timeout(10000),
    });
    // Stream only a bounded prefix even if a server ignores the Range.
    const reader = response.body?.getReader();
    const first = reader ? await reader.read() : null;
    await reader?.cancel();
    const bytes = first?.value;
    const jpeg = bytes?.[0] === 0xff && bytes?.[1] === 0xd8;
    console.log(JSON.stringify({
      realGetVerified: response.ok && jpeg === true, status: response.status,
      jpeg: jpeg === true, realViewerAuthorizationVerified: false,
    }));
    if (!response.ok || !jpeg) process.exitCode = 1;
  }
} catch {
  // Never print SDK/fetch errors, which may contain keys or signed URLs.
  console.log(JSON.stringify({ realGetVerified: false, reason: 'read_check_unavailable' }));
  process.exitCode = 1;
}
