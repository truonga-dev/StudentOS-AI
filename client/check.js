import { execSync } from 'child_process';
try {
  console.log('Running tsc...');
  execSync('npx tsc --noEmit', { stdio: 'inherit' });
  console.log('Success!');
} catch (e) {
  console.error('Failed to run tsc');
  process.exit(1);
}
