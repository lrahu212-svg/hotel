import { spawn } from 'child_process';
import localtunnel from 'localtunnel';

(async () => {
  console.log('Starting backend...');
  const backend = spawn('node', ['server.js'], { stdio: 'inherit', shell: true });

  console.log('Starting frontend...');
  // Use npm on Windows with shell: true
  const frontend = spawn('npm', ['run', 'dev'], { stdio: 'inherit', shell: true });

  console.log('Starting localtunnel on port 5173...');
  try {
    const tunnel = await localtunnel({ port: 5173 });
    console.log('\n=============================================');
    console.log('✅ YOUR PUBLIC LINK IS READY:');
    console.log(`🔗 ${tunnel.url}`);
    console.log('=============================================\n');

    tunnel.on('close', () => {
      console.log('Tunnel closed.');
    });
  } catch (err) {
    console.error('Localtunnel failed:', err);
  }

  process.on('SIGINT', () => {
    backend.kill();
    frontend.kill();
    process.exit();
  });
})();
