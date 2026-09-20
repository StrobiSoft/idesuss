import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');
const menuCore = fs.readFileSync('js/menu/menu-core.js', 'utf8');
const authController = fs.readFileSync('js/menu/auth-controller.js', 'utf8');

const forbiddenRootTokens = [
  '// Idesüss Auth v1',
  'RÉGI REGISTER HANDLER FUT',
  'function createAuthModal()',
  'function checkProfileCompletion()',
  'id="idesussProfileModal"',
  'document.addEventListener("DOMContentLoaded", initAuthButtons)',
  'initAuth({ supabaseClient: window.supabaseClient })'
];

for (const token of forbiddenRootTokens) {
  if (html.includes(token)) {
    throw new Error(`Duplicate GEN1 root auth/profile token present: ${token}`);
  }
}

if (!/<script\s+type=["']module["']\s+src=["']\.\/js\/menu\/menu-core\.js(?:\?[^"']*)?["']><\/script>/.test(html)) {
  throw new Error('Root page must initialize auth/profile only through js/menu/menu-core.js.');
}

if (!/from\s+["']\.\/auth-shell\.js(?:\?[^"']*)?["']/.test(authController)) {
  throw new Error('Root auth controller must own the shared auth shell.');
}

if (!/from\s+["']\.\.\/shared\/auth-service\.js(?:\?[^"']*)?["']/.test(authController)) {
  throw new Error('Root auth controller must use the shared auth service.');
}

if (!/from\s+["']\.\.\/shared\/profile-service\.js(?:\?[^"']*)?["']/.test(authController)) {
  throw new Error('Root auth controller must use the shared profile service.');
}

const dynamicProfileButtonCreation = /createElement\(["']button["']\)[\s\S]{0,500}profileMenuBtn/;
if (dynamicProfileButtonCreation.test(menuCore)) {
  throw new Error('menu-core must not create a second profile button.');
}

if (!menuCore.includes('getElementById("openProfileBtn")')) {
  throw new Error('menu-core must bind the existing canonical profile button.');
}

console.log('Root auth/profile has one canonical runtime path.');
