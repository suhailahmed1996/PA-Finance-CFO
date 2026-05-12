// Learning memory. No ML library, no model, no API.
// Just frequency counting: which word predicts which category for THIS user.
// Memory is a pure derivation from the transaction list, rebuilt as transactions change.

const STOP_WORDS = new Set([
  'on', 'for', 'the', 'a', 'an', 'and', 'or', 'to', 'from', 'at', 'in', 'is',
  'was', 'were', 'i', 'my', 'me', 'of', 'with', 'by', 'as', 'this', 'that',
  'auto', 'paid', 'spent', 'got', 'received', 'rs', 'inr'
]);

// Pull meaningful tokens out of free text
export function tokenize(text) {
  if (!text) return [];
  return text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t && t.length >= 2 && !STOP_WORDS.has(t) && !/^\d+$/.test(t));
}

// Build memory from a list of transactions.
// Memory shape: { token: { category: count } }
// Higher counts mean stronger evidence that this token maps to that category.
export function buildMemory(transactions) {
  const memory = {};
  for (const txn of transactions) {
    if (!txn.description || !txn.category) continue;
    const tokens = tokenize(txn.description);
    for (const token of tokens) {
      if (!memory[token]) memory[token] = {};
      memory[token][txn.category] = (memory[token][txn.category] || 0) + 1;
    }
  }
  return memory;
}

// Given text and a set of candidate categories, return scores from memory.
// Returns { category: score }. Empty object if memory has nothing relevant.
export function predictFromMemory(memory, text, candidateCategories) {
  if (!memory || !text) return {};
  const tokens = tokenize(text);
  const scores = {};
  const candidateSet = new Set(candidateCategories);
  for (const token of tokens) {
    const tokenMap = memory[token];
    if (!tokenMap) continue;
    for (const [cat, count] of Object.entries(tokenMap)) {
      if (!candidateSet.has(cat)) continue;
      scores[cat] = (scores[cat] || 0) + count;
    }
  }
  return scores;
}

// Diagnostic: which tokens does memory know about?
export function memoryStats(memory) {
  const tokenCount = Object.keys(memory).length;
  const allCats = new Set();
  let totalMappings = 0;
  for (const tokenMap of Object.values(memory)) {
    for (const [cat, count] of Object.entries(tokenMap)) {
      allCats.add(cat);
      totalMappings += count;
    }
  }
  return { tokenCount, categoryCount: allCats.size, totalMappings };
}
