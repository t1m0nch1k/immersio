/**
 * Generated dictionary entries that lesson texts actually resolve to.
 *
 * `expandedWords.ts` is a frequency-ranked core vocabulary of ~3.2k entries.
 * Shipping all of it in the user-facing dictionary had two problems: most of it
 * never appears in a single lesson (so the dictionary advertised thousands of
 * words the learner can never meet while reading), and a measurable slice of it
 * has broken translations — 126 entries whose eight translations collapse to
 * three or fewer distinct values, e.g. ru "ох" rendered as "oh" in every
 * language, or ru "ул." turned into "st"/"sv".
 *
 * Dropping the whole corpus, though, is not an option either: 140 of these
 * entries are how lesson texts resolve ordinary words, and they carry 474 word
 * tokens — 14.7% of every word in every lesson. Removing them would unlink real
 * vocabulary and push the immersion ceiling further down.
 *
 * So the dictionary keeps exactly the entries the curriculum needs:
 *   - every hand-written entry from `BASE_WORDS`, and
 *   - the generated entries listed below, which the lessons resolve to.
 *
 * That makes both directions of the dictionary contract literally true:
 * a word you meet in a lesson has a dictionary entry, and every entry in the
 * dictionary is met in a lesson.
 *
 * The list is explicit rather than computed, because the filter would otherwise
 * need the tokenizer, and the tokenizer already imports this module. Drift is
 * caught instead by `tests/storage.mjs`, which asserts that this set is exactly
 * the set of generated ids the lessons resolve to — add a lesson word that needs
 * a new generated entry and that test fails until the id is listed here.
 */
export const LESSON_LINKED_GENERATED_IDS: readonly string[] = [
  'v0002', 'v0007', 'v0009', 'v0016', 'v0018', 'v0022', 'v0025', 'v0026',
  'v0030', 'v0031', 'v0035', 'v0040', 'v0041', 'v0046', 'v0050', 'v0051',
  'v0054', 'v0056', 'v0062', 'v0063', 'v0071', 'v0075', 'v0076', 'v0082',
  'v0091', 'v0096', 'v0098', 'v0104', 'v0110', 'v0126', 'v0128', 'v0131',
  'v0134', 'v0141', 'v0146', 'v0152', 'v0153', 'v0155', 'v0159', 'v0160',
  'v0174', 'v0178', 'v0184', 'v0197', 'v0209', 'v0210', 'v0223', 'v0231',
  'v0250', 'v0251', 'v0288', 'v0305', 'v0311', 'v0349', 'v0356', 'v0369',
  'v0384', 'v0385', 'v0389', 'v0398', 'v0411', 'v0442', 'v0445', 'v0473',
  'v0478', 'v0490', 'v0491', 'v0500', 'v0521', 'v0529', 'v0533', 'v0536',
  'v0541', 'v0543', 'v0566', 'v0569', 'v0623', 'v0644', 'v0652', 'v0658',
  'v0678', 'v0683', 'v0684', 'v0710', 'v0712', 'v0714', 'v0721', 'v0725',
  'v0798', 'v0844', 'v0916', 'v0978', 'v1039', 'v1074', 'v1078', 'v1127',
  'v1150', 'v1156', 'v1174', 'v1321', 'v1349', 'v1378', 'v1425', 'v1442',
  'v1457', 'v1484', 'v1487', 'v1533', 'v1589', 'v1594', 'v1638', 'v1717',
  'v1755', 'v1757', 'v1761', 'v1773', 'v1785', 'v1852', 'v2062', 'v2094',
  'v2104', 'v2180', 'v2188', 'v2221', 'v2253', 'v2311', 'v2339', 'v2350',
  'v2458', 'v2478', 'v2624', 'v2637', 'v2874', 'v2900', 'v2987', 'v3051',
  'v3184', 'v3205', 'v3301', 'v3389',
];