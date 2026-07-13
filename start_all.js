import { spawn } from 'child_process';

(async () => {
  console.log('Starting backend...');
  const backend = spawn('node', ['server.js'], { stdio: 'inherit', shell: true });

  console.log('Starting frontend...');
  // Use npm on Windows with shell: true
  const frontend = spawn('npm', ['run', 'dev'], { stdio: 'inherit', shell: true });

  process.on('SIGINT', () => {
    backend.kill();
    frontend.kill();
    process.exit();
  });
})();
