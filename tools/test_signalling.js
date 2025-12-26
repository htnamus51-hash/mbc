// Simple test script that creates two socket.io clients and verifies
// that call.offer gets forwarded by the server.
const io = require('socket.io-client');

const SERVER = process.env.SERVER || 'http://localhost:8008';
const TEST_EMAIL = process.env.TEST_EMAIL || 'admin@mbctherapy.com';

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function run() {
  console.log('Starting signalling test against', SERVER);

  const a = io(SERVER, { transports: ['websocket'], reconnection: false });
  const b = io(SERVER, { transports: ['websocket'], reconnection: false });

  a.on('connect', () => console.log('[A] connected', a.id));
  b.on('connect', () => console.log('[B] connected', b.id));

  a.on('error', (e) => console.log('[A] error', e));
  b.on('error', (e) => console.log('[B] error', e));

  b.on('call.offer', (payload) => {
    console.log('[B] received call.offer payload ->', JSON.stringify(payload));
  });

  // debug: log any incoming events on B
  b.onAny((ev, payload) => {
    console.log(`[B] any event -> ${ev}`, payload && typeof payload === 'object' ? JSON.stringify(payload) : payload);
  });

  a.onAny((ev, payload) => {
    console.log(`[A] any event -> ${ev}`, payload && typeof payload === 'object' ? JSON.stringify(payload) : payload);
  });

  a.on('call.answer', (payload) => {
    console.log('[A] received call.answer payload ->', JSON.stringify(payload));
  });

  b.on('receive_message', (msg) => {
    console.log('[B] received message ->', JSON.stringify(msg));
  });

  // connect both clients and join as the same test email (server requires existing user)
  await new Promise((resolve) => {
    let connected = 0;
    const check = () => { connected += 1; if (connected === 2) resolve(); };
    a.on('connect', () => { a.emit('user_joined', { email: TEST_EMAIL }); check(); });
    b.on('connect', () => { b.emit('user_joined', { email: TEST_EMAIL }); check(); });
  });

  // give server a moment to register sids and handlers
  await wait(1000);

  console.log('[A] emitting call.offer -> target:', TEST_EMAIL);
  a.emit('call.offer', { to: TEST_EMAIL, sdp: { type: 'offer', sdp: 'fake-sdp' } });

  // Also test normal message flow
  console.log('[A] emitting send_message -> target:', TEST_EMAIL);
  a.emit('send_message', { receiver_email: TEST_EMAIL, content: 'hello from test client' });

  // wait to observe events
  await wait(3000);

  console.log('Test complete; disconnecting');
  try { a.disconnect(); } catch (e) {}
  try { b.disconnect(); } catch (e) {}
  process.exit(0);
}

run().catch((e) => { console.error('Test failed', e); process.exit(1); });
