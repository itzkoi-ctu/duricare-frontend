import { t } from '../../i18n';
import type { CitationGroup } from '../../types/citation';

interface CitationChipsProps {
  groups: CitationGroup[];
  onSelectGroup: (group: CitationGroup) => void;
  maxVisible?: number;
}

export default function CitationChips({
  groups,
  onSelectGroup,
  maxVisible = 2,
}: CitationChipsProps) {
  if (!groups || groups.length === 0) return null;

  // If total is 3, showing 2 chips + "+1" takes the same space as showing 3 chips.
  // So show all 3 if length <= 3, otherwise show maxVisible + overflow button.
  const limit = groups.length <= 3 ? groups.length : maxVisible;
  const visibleGroups = groups.slice(0, limit);
  const overflowCount = groups.length - limit;

  return (
    <div
      role="region"
      aria-label={t('Nguồn tham khảo')}
      className="mt-3 pt-2.5 border-t border-border/60"
    >
      <div className="flex items-center gap-1.5 text-xs font-semibold text-gray mb-2">
        <span aria-hidden="true" className="material-symbols-outlined text-[15px] text-navy dark:text-blue">
          menu_book
        </span>
        <span>{t('Nguồn tham khảo')}</span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {visibleGroups.map((group, index) => {
          const numberLabel = index + 1;
          const accessibleName = t('Nguồn {0}: {1} (bản {2})', [
            numberLabel,
            group.sourceTitle,
            group.revisionNumber,
          ]);

          return (
            <button
              key={group.id}
              type="button"
              onClick={() => onSelectGroup(group)}
              aria-label={accessibleName}
              title={`${group.sourceTitle} (${t('bản {0}', [group.revisionNumber])})`}
              className="group inline-flex items-center gap-1.5 min-h-[32px] max-w-[200px] sm:max-w-[260px] rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-text hover:border-navy hover:text-navy dark:hover:border-blue dark:hover:text-blue transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-navy/30"
            >
              <span className="font-semibold text-navy dark:text-blue shrink-0">
                [{numberLabel} ·
              </span>
              <span className="truncate text-left">{group.sourceTitle}</span>
              <span className="font-semibold text-navy dark:text-blue shrink-0">]</span>
            </button>
          );
        })}

        {overflowCount > 0 && (
          <button
            type="button"
            onClick={() => onSelectGroup(groups[limit])}
            aria-label={t('Xem thêm {0} nguồn tham khảo khác', [overflowCount])}
            title={t('Xem thêm {0} nguồn tham khảo khác', [overflowCount])}
            className="inline-flex items-center min-h-[32px] rounded-lg border border-dashed border-border bg-surface px-2.5 py-1 text-xs font-medium text-gray hover:border-navy hover:text-navy dark:hover:border-blue dark:hover:text-blue transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-navy/30"
          >
            +{overflowCount} {t('nguồn')}
          </button>
        )}
      </div>
    </div>
  );
}
