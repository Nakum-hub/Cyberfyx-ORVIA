/** Preserve human requirement mapping work while checking immutable provenance.
 * Acceptance is never inferred from source presence or a regenerated index. */
export type SourceSection = {
  source_section: number; title: string; start_line: number; end_line: number;
  normalized_content_sha256: string; review_status: string;
  requirement_mappings: unknown[]; acceptance_status: string;
};
export function preserveSourceReviews<T extends { sections: SourceSection[] }>(fresh: T, previous: unknown): T {
  if (!previous || typeof previous !== 'object' || !('sections' in previous) || !Array.isArray(previous.sections))
    throw new Error('Invalid source inventory');
  const { sections: oldSections, ...oldMetadata } = previous;
  const { sections, ...metadata } = fresh;
  if (JSON.stringify(oldMetadata) !== JSON.stringify(metadata) || oldSections.length !== sections.length)
    throw new Error('Source inventory provenance changed; review required');
  return { ...fresh, sections: sections.map((section, index) => {
    const old = oldSections[index] as SourceSection;
    if (!old || typeof old !== 'object') throw new Error('Invalid source section');
    const { review_status, requirement_mappings, acceptance_status, ...oldSource } = old;
    const source = Object.fromEntries(Object.entries(section)
      .filter(([key]) => !['review_status', 'requirement_mappings', 'acceptance_status'].includes(key)));
    if (JSON.stringify(oldSource) !== JSON.stringify(source)) throw new Error(`Source section ${section.source_section} changed; review required`);
    if (typeof review_status !== 'string' || !review_status.trim() || !Array.isArray(requirement_mappings) ||
        typeof acceptance_status !== 'string' || !acceptance_status.trim()) throw new Error('Invalid review state');
    return { ...section, review_status, requirement_mappings: structuredClone(requirement_mappings), acceptance_status };
  }) };
}
