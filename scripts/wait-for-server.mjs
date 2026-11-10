const url = process.argv[2];
const deadline = Date.now() + 120_000;
while (Date.now() < deadline) {
  try {
    const response = await fetch(url);
    if (response.ok) process.exit(0);
  } catch {}
  await new Promise(resolve => setTimeout(resolve, 1000));
}
console.error(`Server did not become ready: ${url}`);
process.exit(1);
