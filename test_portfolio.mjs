import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== Personal Portfolio Test Suite (Thumbnails & Thoughts) ===\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${message}`);
  }
}

// 1. Test Config Files
console.log('1. Testing JSON Configuration Files:');
const site = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'site.json'), 'utf8'));
const projects = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'projects.json'), 'utf8'));
const interests = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'interests.json'), 'utf8'));

assert(site.name === 'Tanmay Kumar', 'site.json name is Tanmay Kumar');
assert(Array.isArray(projects) && projects.length === 5, 'projects.json has 5 projects');
assert(projects.some(p => p.repo === 'cherenkovlens' && p.liveUrl.includes('cherenkovlens.vercel.app')), 'projects.json includes cherenkovlens with Vercel link');

// Verify Research Focus is REMOVED
assert(!interests.some(i => i.id === 'focus' || (i.title && i.title.toLowerCase().includes('research focus'))), 'Research Focus is removed from subpages');

// Check remaining subpages
const requiredSubpages = ['movies', 'books', 'music', 'photography', 'other'];
requiredSubpages.forEach(subId => {
  const item = interests.find(i => i.id === subId);
  assert(!!item, `interests.json has sub-page: ${subId}`);
});

// Check movies, books, music have entries with thumbnail & thought
['movies', 'books', 'music'].forEach(catId => {
  const cat = interests.find(i => i.id === catId);
  assert(Array.isArray(cat.entries) && cat.entries.length > 0, `${catId} has entries array`);
  const first = cat.entries[0];
  assert(typeof first.title === 'string', `${catId} entry has title`);
  assert(typeof first.image === 'string' && first.image.length > 0, `${catId} entry has thumbnail image`);
  assert(typeof first.thought === 'string' && first.thought.length > 20, `${catId} entry has personal reflection thought`);
});

// 2. Test index.html has both About and Interests container
console.log('\n2. Testing index.html:');
const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
assert(indexHtml.includes('id="about"'), 'index.html has About section');
assert(indexHtml.includes('id="interests-container"'), 'index.html has interests-container for subpages');
assert(indexHtml.includes('id="contact-heading"'), 'index.html has Contact section');
assert(indexHtml.includes('href="projects.html"'), 'index.html links to projects.html');

// 3. Test projects.html
console.log('\n3. Testing projects.html:');
const projectsHtml = fs.readFileSync(path.join(__dirname, 'projects.html'), 'utf8');
assert(projectsHtml.includes('id="projects-list"'), 'projects.html has projects list');
assert(projectsHtml.includes('id="contact-heading"'), 'projects.html has Contact section');
assert(projectsHtml.includes('href="index.html"'), 'projects.html links to About (index.html)');

// 4. Test CSS for Reviews & Thumbnails
console.log('\n4. Testing CSS:');
const cssContent = fs.readFileSync(path.join(__dirname, 'css', 'style.css'), 'utf8');
assert(cssContent.includes('.subpage-nav'), 'CSS has .subpage-nav styling');
assert(cssContent.includes('.review-entry-card'), 'CSS has .review-entry-card styling');
assert(cssContent.includes('.review-thumb-img'), 'CSS has .review-thumb-img styling');
assert(cssContent.includes('.review-thought'), 'CSS has .review-thought styling');

// 5. Test JS module
console.log('\n5. Testing JS Module:');
const { fetchRepoMetadata } = await import('./js/github.js');
assert(typeof fetchRepoMetadata === 'function', 'github.js fetchRepoMetadata works');

console.log(`\n=== Results: ${passedTests}/${totalTests} Tests Passed ===\n`);

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
