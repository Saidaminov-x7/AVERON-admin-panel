const url = process.argv[2];
const deadline = Date.now() + 120_000;
let lastStatus = 'no response';
while (Date.now() < deadline) {
  try {
    const response = await fetch(url);
    lastStatus = `HTTP ${response.status}`;
    if (response.ok) process.exit(0);
    await response.body?.cancel();
  } catch (error) { lastStatus = String(error); }
  await new Promise(resolve => setTimeout(resolve, 1000));
}
console.error(`Server did not become ready: ${url} (last result: ${lastStatus})`);
process.exit(1);
