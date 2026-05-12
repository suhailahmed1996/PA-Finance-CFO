// Pattern-based transaction parser. No API. No network.
// Parses free text like "spent 500 on lunch" into structured transactions.

const KEYWORDS = {
  income: ['received', 'got paid', 'salary', 'invoice paid', 'earned', 'income', 'credit', 'refund', 'transferred from', 'deposit', 'bonus', 'dividend', 'rent received'],
  expense: ['spent', 'paid', 'bought', 'purchased', 'expense', 'cost', 'bill', 'debit', 'transferred to', 'gave']
};

const BUSINESS_HINTS = ['client', 'invoice', 'project', 'office', 'team', 'employee', 'salary paid', 'vendor', 'gst', 'business', 'company', 'startup', 'software subscription', 'aws', 'github', 'figma', 'slack'];

const CATEGORY_KEYWORDS = {
  // Personal expense
  'Food': ['food', 'lunch', 'dinner', 'breakfast', 'meal', 'snack', 'restaurant', 'cafe', 'coffee', 'tea', 'swiggy', 'zomato', 'eat', 'pizza', 'burger', 'biryani', 'dosa', 'thali', 'groceries', 'grocery', 'bigbasket', 'blinkit', 'zepto', 'fruits', 'vegetables'],
  'Transport': ['uber', 'ola', 'auto', 'taxi', 'fuel', 'petrol', 'diesel', 'metro', 'bus', 'train', 'flight', 'rapido', 'parking', 'toll', 'cab'],
  'Housing': ['rent', 'maintenance', 'society', 'mortgage', 'home loan'],
  'Shopping': ['amazon', 'flipkart', 'myntra', 'ajio', 'shopping', 'clothes', 'shirt', 'jeans', 'shoes', 'bag', 'electronics', 'phone', 'laptop', 'headphones', 'gift'],
  'Health': ['doctor', 'medicine', 'pharmacy', 'hospital', 'apollo', 'practo', 'medical', 'health', 'gym', 'fitness', 'yoga', 'lab test', 'dental'],
  'Entertainment': ['movie', 'cinema', 'pvr', 'inox', 'bookmyshow', 'netflix', 'prime', 'spotify', 'youtube premium', 'game', 'gaming', 'concert', 'event', 'party', 'drinks', 'alcohol', 'bar'],
  'Subscriptions': ['subscription', 'netflix', 'prime video', 'spotify', 'apple music', 'hotstar', 'sony liv', 'icloud', 'google one', 'gym membership'],
  'Utilities': ['electricity', 'water', 'gas', 'internet', 'wifi', 'mobile', 'phone bill', 'broadband', 'recharge', 'jio', 'airtel', 'vi', 'bill'],
  'Personal Care': ['salon', 'haircut', 'spa', 'cosmetics', 'skincare', 'makeup', 'parlour'],
  'Education': ['course', 'book', 'tuition', 'class', 'udemy', 'coursera', 'school fees', 'college'],
  'Family': ['gift', 'family', 'parents', 'wedding', 'birthday', 'mother', 'father', 'kids'],
  'Debt/EMI': ['emi', 'loan', 'credit card', 'cc bill', 'debt'],
  // Business expense
  'Software': ['software', 'subscription', 'saas', 'aws', 'github', 'figma', 'slack', 'notion', 'zoom', 'google workspace', 'microsoft', 'office 365', 'adobe', 'canva'],
  'Marketing': ['ads', 'marketing', 'facebook ads', 'google ads', 'instagram ads', 'linkedin ads', 'seo', 'campaign', 'promo'],
  'Travel': ['travel', 'flight', 'hotel', 'business travel', 'oyo', 'makemytrip', 'goibibo'],
  'Office': ['office', 'rent office', 'coworking', 'wework', 'awfis', 'stationery'],
  'Equipment': ['laptop', 'monitor', 'keyboard', 'mouse', 'webcam', 'mic', 'equipment'],
  'Professional Services': ['lawyer', 'ca', 'accountant', 'consultant', 'legal', 'professional'],
  'Salaries': ['salary', 'payroll', 'employee', 'team salary'],
  'Inventory': ['inventory', 'stock', 'raw material', 'goods'],
  'Taxes': ['gst', 'tax', 'tds', 'income tax', 'advance tax'],
  // Personal income
  'Salary': ['salary', 'monthly salary', 'payroll'],
  'Freelance': ['freelance', 'gig', 'project payment', 'consulting'],
  'Investment': ['dividend', 'interest', 'mutual fund', 'mf', 'stock', 'capital gain'],
  'Rental': ['rent received', 'tenant'],
  'Gift': ['gift', 'gift money'],
  // Business income
  'Sales': ['sales', 'order', 'customer paid', 'product sale'],
  'Service Revenue': ['service', 'consulting fee', 'service revenue', 'invoice paid'],
  'Recurring Revenue': ['subscription revenue', 'mrr', 'arr', 'recurring']
};

const PERSONAL_CATS_EXPENSE = ['Food', 'Transport', 'Housing', 'Shopping', 'Health', 'Entertainment', 'Subscriptions', 'Utilities', 'Personal Care', 'Education', 'Family', 'Debt/EMI'];
const BUSINESS_CATS_EXPENSE = ['Software', 'Marketing', 'Travel', 'Office', 'Equipment', 'Professional Services', 'Salaries', 'Inventory', 'Taxes'];
const PERSONAL_CATS_INCOME = ['Salary', 'Freelance', 'Investment', 'Rental', 'Gift'];
const BUSINESS_CATS_INCOME = ['Sales', 'Service Revenue', 'Recurring Revenue'];

export function parseTransaction(text) {
  if (!text || !text.trim()) {
    return { error: 'Empty input' };
  }

  const lower = text.toLowerCase().trim();

  // Extract amount: numbers with optional decimal, optional rs/inr/₹ prefix/suffix, optional k/l/cr suffix
  const amountMatch = lower.match(/(?:rs\.?|inr|₹)?\s*([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?)\s*(k|lakh|lac|l|cr|crore)?/i);
  if (!amountMatch) {
    return { error: 'Could not find an amount in your input. Try something like "spent 500 on lunch".' };
  }

  let amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  const suffix = (amountMatch[2] || '').toLowerCase();
  if (suffix === 'k') amount *= 1000;
  else if (suffix === 'l' || suffix === 'lakh' || suffix === 'lac') amount *= 100000;
  else if (suffix === 'cr' || suffix === 'crore') amount *= 10000000;

  if (isNaN(amount) || amount <= 0) {
    return { error: 'Could not parse the amount.' };
  }

  // Determine type (income vs expense)
  let type = null;
  for (const kw of KEYWORDS.income) {
    if (lower.includes(kw)) { type = 'income'; break; }
  }
  if (!type) {
    for (const kw of KEYWORDS.expense) {
      if (lower.includes(kw)) { type = 'expense'; break; }
    }
  }
  // Default to expense if no keyword (most logging is expense)
  if (!type) type = 'expense';

  // Determine scope
  let scope = 'personal';
  for (const hint of BUSINESS_HINTS) {
    if (lower.includes(hint)) { scope = 'business'; break; }
  }

  // Match category by keywords with relevance scoring
  const candidates = type === 'income'
    ? (scope === 'business' ? BUSINESS_CATS_INCOME : PERSONAL_CATS_INCOME)
    : (scope === 'business' ? BUSINESS_CATS_EXPENSE : PERSONAL_CATS_EXPENSE);

  let bestCat = candidates[candidates.length - 1]; // default to last (usually "Other")
  let bestScore = 0;
  for (const cat of candidates) {
    const kws = CATEGORY_KEYWORDS[cat] || [];
    let score = 0;
    for (const kw of kws) {
      if (lower.includes(kw)) {
        score += kw.length; // longer keyword matches win
      }
    }
    if (score > bestScore) { bestScore = score; bestCat = cat; }
  }

  // If no category matched, set to "Other" variant
  if (bestScore === 0) {
    bestCat = type === 'expense'
      ? (scope === 'business' ? 'Other Business' : 'Other')
      : (scope === 'business' ? 'Other Business' : 'Other Personal');
  }

  // Description: try to extract text after "on" or "for"
  let description = text.trim();
  const descMatch = text.match(/(?:on|for|to)\s+(.+?)(?:\s+for\s|$)/i);
  if (descMatch) {
    description = descMatch[1].trim();
  } else {
    // Strip the amount and common verbs
    description = text
      .replace(/(?:rs\.?|inr|₹)?\s*[0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?\s*(?:k|lakh|lac|l|cr|crore)?/gi, '')
      .replace(/\b(spent|paid|bought|got|received|on|for|to)\b/gi, '')
      .trim();
    if (!description) description = bestCat;
  }

  return {
    type,
    amount,
    scope,
    category: bestCat,
    description: description.slice(0, 80)
  };
}
