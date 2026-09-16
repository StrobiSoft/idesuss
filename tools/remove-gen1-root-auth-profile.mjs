import fs from 'node:fs';

const path = 'index.html';
let html = fs.readFileSync(path, 'utf8');

const startMarker = '// Idesüss Auth v1';
const endMarker = 'function getVisitorKey() {';
const start = html.indexOf(startMarker);
const end = html.indexOf(endMarker);

if (start < 0) {
  console.log('GEN1 root auth/profile block already removed.');
} else {
  if (end < 0 || end <= start) {
    throw new Error('Could not locate the end of the GEN1 auth/profile block.');
  }
  html = html.slice(0, start) + '// Root auth/profile is owned by js/menu/* + js/shared/*.\n' + html.slice(end);
}

html = html.replace(
  /\n\s*const loginBtn = document\.getElementById\("loginBtn"\);\n/, 
  '\n'
);

html = html.replace(
  /\n\s*if \(loginBtn\) \{\n\s*loginBtn\.addEventListener\("click", \(\) => \{\n\s*openInfoPanel\("login"\);\n\s*\}\);\n\s*\}\n/,
  '\n'
);

html = html.replace(
  /\n<script type="module">\n\s*import \{ initAuth \} from "\.\/js\/lang\/modules\/auth\/lang\/auth\.js";\n\s*initAuth\(\{ supabaseClient: window\.supabaseClient \}\);\n<\/script>\n/,
  '\n'
);

const forbidden = [
  '// Idesüss Auth v1',
  'RÉGI REGISTER HANDLER FUT',
  'function createAuthModal()',
  'function checkProfileCompletion()',
  'id="idesussProfileModal"',
  'document.addEventListener("DOMContentLoaded", initAuthButtons)',
  'initAuth({ supabaseClient: window.supabaseClient })'
];

for (const token of forbidden) {
  if (html.includes(token)) {
    throw new Error(`GEN1 token still present after cleanup: ${token}`);
  }
}

fs.writeFileSync(path, html);
console.log('GEN1 root auth/profile block removed; shared auth/profile remains the single root path.');
